//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

import "contracts/EffectsAllowList.sol";
import "contracts/IBundleNFT.sol";

// Errors:
// E01: mintItem is not permitted
// E02: Operation is not permitted
// E03: The token you are trying to remove has a special role
// E04: One of NFTs you asked to remove does not exist in the bundle
// E05: ERC721: transfer of token that is not own
// E06: ERC721Metadata: Bundeled tokens query for nonexistent token
// E07: Bundling requires original + modifier or nothing
// E08: AllowList disallows that configuration
// E09: Bundle fee not paid

contract BundleNFT is
    IBundleNFT,
    Initializable,
    OwnableUpgradeable,
    ERC721URIStorageUpgradeable,
    ERC721EnumerableUpgradeable,
    IERC721ReceiverUpgradeable
{
    mapping(uint256 => NFT[]) public bundles;

    EffectsAllowList public effectsAllowList;
    mapping(uint256 => uint256) public parentBundle;
    mapping(uint256 => mapping(address => bool)) modificationAllowances;
    mapping(uint256 => address[]) modificationAllowancesEnumerated;

    event MintMessage(uint256 message);

    uint256 public constant bundleBaseFee = 15000000000000000; // 0.015 Ether
    uint256 public constant MintFeeCoeff = 1; // 1 * bundleBaseFee.
    uint256 public constant CreateBundleFeeCoeff = 2;
    uint256 public constant UnbundleFeeCoeff = 2;
    uint256 public constant AddToBundleFeeCoeff = 1;
    uint256 public constant RemoveFromBundleFeeCoeff = 1;

    // Share assumes the denominator of 1000. So 200 is for 0.2, or 20%.
    uint256 public constant effectOwnerShare = 334;
    uint256 public constant contractOwnerShare = 333;
    uint256 public constant doNftShare = 333;
    uint256 public constant denominator = 1000;

    address payable public constant doNftWallet =
        payable(0x8fb1d5e8f4dda65302F904Cd8C7F3d09A1130E0d);

    mapping(uint256 => uint256) unbundlePrice;
    mapping(uint256 => address payable) creators;

    function initialize(string memory name_, string memory symbol_)
        public
        initializer
    {
        __Ownable_init();
        __ERC721_init(name_, symbol_);
        __ERC721URIStorage_init();
        __ERC721Enumerable_init();
    }

    function bundleAndSetUnbundlePrice(NFT[] memory _tokens, uint256 _unbundlePrice)
        public
        payable
        returns (uint256)
    {
        checkAllowList(_tokens);
        _checkFees(CreateBundleFeeCoeff);

        uint256 tokenId = uint256(keccak256(abi.encode(_tokens)));
        unbundlePrice[tokenId] = _unbundlePrice;
        creators[tokenId] = payable(msg.sender);
        uint256 tokensLen = _tokens.length;
        for (uint256 i = 0; i < tokensLen; ) {
            _maybeSendFeeToEffectCreator(_tokens[i]);
            _maybeSetParent(_tokens[i], tokenId);
            _tokens[i].token.safeTransferFrom(
                msg.sender,
                address(this),
                _tokens[i].tokenId
            );
            bundles[tokenId].push(_tokens[i]); // todo: verify safety
            unchecked {
                ++i;
            }
        }

        _safeMint(msg.sender, tokenId);
        emit MintMessage(tokenId);
        return tokenId;
    }
    function bundle(NFT[] memory _tokens)
        public
        payable
        override
        returns (uint256)
    {
        return bundleAndSetUnbundlePrice(_tokens, 0);
    }

    function mintItemAndSetUnbundlePrice(
        address to,
        uint256 tokenId,
        string memory uri,
        uint256 _unbundlePrice
    ) public payable returns (uint256) {
        require(!_exists(tokenId));
        _checkFees(MintFeeCoeff);
        unbundlePrice[tokenId] = _unbundlePrice;
        creators[tokenId] = payable(msg.sender);

        _safeMint(to, tokenId);
        emit MintMessage(tokenId);
        _setTokenURI(tokenId, uri);

        return tokenId;
    }
    function mintItem(
        address to,
        uint256 tokenId,
        string memory uri
    ) public payable returns (uint256) {
        return mintItemAndSetUnbundlePrice(to, tokenId, uri, 0);
    }

    function mintItemAndSetUnbundlePrice(address to, string memory uri, uint256 _unbundlePrice)
        public
        payable
        returns (uint256)
    {
        uint256 tokenId = uint256(keccak256(abi.encode(uri)));
        while (_exists(tokenId)) {
            tokenId += 1;
        }
        unbundlePrice[tokenId] = _unbundlePrice;
        creators[tokenId] = payable(msg.sender);
        return mintItemAndSetUnbundlePrice(to, tokenId, uri, _unbundlePrice);
    }
    function mintItem(address to, string memory uri)
        public
        payable
        returns (uint256)
    {
        return mintItemAndSetUnbundlePrice(to, uri, 0);
    }

    /**
     * @dev Check if the msg.sender is allowed to add NFTs to bundle.
     *      This is useful to prevent spamming with potentially
     *      dangerous/unwanted NFTs.
     *
     *      At the moment, the permission to add NFT also grants a permission
     *      to add another contract as permissioned to add NFTs.
     */
    function allowedToAddNFTs(uint256 tokenId) public view returns (bool) {
        require(_exists(tokenId));
        if (ownerOf(tokenId) == msg.sender) return true;
        if (modificationAllowances[tokenId][msg.sender]) return true;

        uint256 parentTokenId = parentBundle[tokenId];
        if (parentTokenId != 0) return allowedToAddNFTs(parentTokenId);

        return false;
    }

    function setAllowance(address externalContract, uint256 tokenId, bool value) public {
        require(allowedToAddNFTs(tokenId));
        modificationAllowances[tokenId][externalContract] = value;
        if (value) {
            modificationAllowancesEnumerated[tokenId].push(externalContract);
        }
    }
    function hasAllowance(address externalContract, uint256 tokenId) public view returns (bool) {
        return modificationAllowances[tokenId][externalContract];
    }


    function removeAllAllowances(uint256 tokenId) public {
        require(allowedToAddNFTs(tokenId));
        _removeAllAllowances(tokenId);
    }
    function _removeAllAllowances(uint256 tokenId) internal {
        uint256 allAllowancesLen = modificationAllowancesEnumerated[tokenId].length;
        for (uint256 i = 0; i < allAllowancesLen; ) {
            modificationAllowances[tokenId][modificationAllowancesEnumerated[tokenId][i]] = false;
            unchecked {
                ++i;
            }
        }
        delete modificationAllowancesEnumerated[tokenId];

        for (uint256 i = 0; i < bundles[tokenId].length; ) {
            if (address(bundles[tokenId][i].token) == address(this)) {
                _removeAllAllowances(bundles[tokenId][i].tokenId);
            }
            unchecked {
                ++i;
            }
        }
    }

    // Compare tokens without TokenRole.
    function isEqual(NFT memory nft1, NFT memory nft2)
        internal
        pure
        returns (bool)
    {
        return (keccak256(abi.encodePacked(nft1.token, nft1.tokenId)) ==
            keccak256(abi.encodePacked(nft2.token, nft2.tokenId)));
    }

    /**
     * @dev Add NFT to bundle.
     */
    function addNFTsToBundle(
        uint256 tokenId,
        NFT[] memory _tokens,
        string memory _tokenURI
    ) public payable override {
        require(allowedToAddNFTs(tokenId), "E02.4");
        _checkFees(AddToBundleFeeCoeff);

        for (uint256 i = 0; i < _tokens.length; i++) {
            _maybeSendFeeToEffectCreator(_tokens[i]);
            _maybeSetParent(_tokens[i], tokenId);
            _tokens[i].token.safeTransferFrom(
                msg.sender,
                address(this),
                _tokens[i].tokenId
            );
            bundles[tokenId].push(_tokens[i]); // todo: verify safety
        }
        _setTokenURI(tokenId, _tokenURI);
    }

    /**
     * @dev Remove NFTs from bundle.
     *      Important things:
     *      1) arguents are tokens and not indexes to gurantee a safety against a replay attack
     *      2) you can not remove base token.
     *      3) compared to unbundle method, which is considered a last resort,
     *         removeNFTsToBundle is all-or-nothing sematics, to make its usage more predictable
     *         and easier for third-party callers.
     */
    function removeNFTsFromBundle(
        uint256 _tokenId,
        NFT[] memory _tokens,
        string memory _tokenURI
    ) public payable override {
        require(allowedToAddNFTs(_tokenId), "E02.5");
        _checkFees(RemoveFromBundleFeeCoeff);

        NFT[] storage _bundle = bundles[_tokenId];

        for (uint256 i = 0; i < _tokens.length; ++i) {
            uint256 j = 0;
            for (; j < _bundle.length; ++j) {
                if (isEqual(_tokens[i], _bundle[j])) {
                    require(
                        _bundle[j].role != TokenRole.Modifier &&
                            _bundle[j].role != TokenRole.Original,
                        "E03"
                    );
                    break;
                }
            }
            require(j < _bundle.length, "E04");
            _unsetParent(_bundle[j]);
            IERC721 token = _bundle[j].token;
            uint256 tokenId = _bundle[j].tokenId;
            if (j < _bundle.length - 1) {
                _bundle[j].token = _bundle[_bundle.length-1].token;
                _bundle[j].tokenId = _bundle[_bundle.length-1].tokenId;
                _bundle[j].role = _bundle[_bundle.length-1].role;
            }
            _bundle.pop();
            token.safeTransferFrom(
                address(this),
                msg.sender,
                tokenId
            );
        }
        _setTokenURI(_tokenId, _tokenURI);
    }

    /**
     * @dev Bundle multiple NFTs into a merged token with new content.
     */
    function bundleWithTokenURIAndSetUnbundlePrice(NFT[] memory _tokens, string memory _tokenURI, uint256 _unbundlePrice)
        public
        payable
        returns (uint256)
    {
        uint256 tokenId = bundleAndSetUnbundlePrice(_tokens, _unbundlePrice);
        _setTokenURI(tokenId, _tokenURI);
        return tokenId;
    }
    function bundleWithTokenURI(NFT[] memory _tokens, string memory _tokenURI)
        public
        payable
        returns (uint256)
    {
        return bundleWithTokenURIAndSetUnbundlePrice(_tokens, _tokenURI, 0);
    }


    /**
     * @dev Disassemble a bundle token.
     */
    function unbundle(uint256 _tokenId) public payable override {
        require(ownerOf(_tokenId) == msg.sender, "E05");
        uint256 remainingValue = msg.value;
        uint256 ourFees = bundleBaseFee * UnbundleFeeCoeff;
        require(remainingValue >= ourFees);

        uint256 directPayAmount = (msg.value / denominator) * doNftShare;
        require(remainingValue >= directPayAmount);
        doNftWallet.transfer(directPayAmount);
        remainingValue -= directPayAmount;

        uint256 unbundleFees = unbundlePrice[_tokenId];
        if (unbundleFees > 0) {
            require(remainingValue >= unbundleFees);
            payable(creators[_tokenId]).transfer(unbundleFees);
            remainingValue -= unbundleFees;
        }

        delete unbundlePrice[_tokenId];

        NFT[] memory _bundle = bundles[_tokenId];
        uint256[] memory _newBundle = new uint256[](_bundle.length);
        uint256 _newBundleSize = 0;
        _burn(_tokenId);
        delete (bundles[_tokenId]);
        for (uint256 i = 0; i < _bundle.length; i++) {
            (
                bool success,
            ) = address(_bundle[i].token).call( // This creates a low level call to the token
                    abi.encodePacked( // This encodes the function to call and the parameters to pass to that function
                        bytes4(
                            keccak256(
                                bytes(
                                    "safeTransferFrom(address,address,uint256)"
                                )
                            )
                        ), // This is the function identifier of the function we want to call
                        abi.encode(
                            address(this),
                            msg.sender,
                            _bundle[i].tokenId
                        ) // This encodes the parameter we want to pass to the function
                    )
                );
            if (!success) {
                _newBundle[_newBundleSize] = i;
                _newBundleSize += 1;
            } else {
                _unsetParent(_bundle[i]);
            }
        }
        if (_newBundleSize > 0) {
            _safeMint(msg.sender, _tokenId);
            for (uint256 i = 0; i < _newBundleSize; i++) {
                bundles[_tokenId].push(_bundle[_newBundle[i]]); // todo: verify safety
            }
        }
    }

    /**
     * @dev Whenever an {IERC721} `tokenId` token is transferred to this contract via {IERC721-safeTransferFrom}
     * by `operator` from `from`, this function is called.
     *
     * It must return its Solidity selector to confirm the token transfer.
     * If any other value is returned or the interface is not implemented by the recipient, the transfer will be reverted.
     *
     * The selector can be obtained in Solidity with `IERC721.onERC721Received.selector`.
     */
    function onERC721Received(
        address, /* operator */
        address, /* from */
        uint256, /* tokenId */
        bytes calldata /* data */
    ) external pure returns (bytes4) {
        // todo: revert if this is not called within `bundle`
        return this.onERC721Received.selector;
    }

    /**
     * @dev Withdraw all fees to the owner address
     */
    function withdrawFees() public onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }

    /**
     * @dev Returns list on NFTs in bundle NFT by tokenId
     */
    function bundeledTokensOf(uint256 _tokenId)
        public
        view
        returns (NFT[] memory)
    {
        require(_exists(_tokenId));
        return bundles[_tokenId];
    }

    function setEffecstAllowList(EffectsAllowList _effectsAllowList)
        public
        onlyOwner
    {
        effectsAllowList = _effectsAllowList;
    }

    function checkAllowList(NFT[] memory _tokens) private view {
        uint32 countOriginals = 0;
        uint32 countModifiers = 0;
        uint256 originalIndex = 0;
        uint256 modifierIndex = 0;

        uint256 tokensLen = _tokens.length;
        for (uint256 i = 0; i < tokensLen; ) {
            if (_tokens[i].role == TokenRole.Original) {
                unchecked {
                    ++countOriginals;
                    originalIndex = i;
                }
            }
            if (_tokens[i].role == TokenRole.Modifier) {
                unchecked {
                    ++countModifiers;
                    modifierIndex = i;
                }
            }
            unchecked {
                ++i;
            }
        }
        require(
            countOriginals <= 1 && countModifiers <= countOriginals
        );

        if (
            countModifiers == 1 &&
            effectsAllowList != EffectsAllowList(address(0x0))
        ) {
            require(
                effectsAllowList.checkPermission(
                    address(_tokens[originalIndex].token),
                    address(_tokens[modifierIndex].token)
                )
            );
        }
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
        returns (bool)
    {
        return
            interfaceId == type(IBundleNFT).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    )
        internal
        virtual
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
    {
        // If you transfer your NFT to someone else - remove all allowances.
        // Otherwise, when it is transferred in your own hierarchy, leave them.
        if (_exists(tokenId) && from != address(this) && to != address(this))
            _removeAllAllowances(tokenId);
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function _burn(uint256 tokenId)
        internal
        virtual
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
    {
        _removeAllAllowances(tokenId);
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        return ERC721URIStorageUpgradeable.tokenURI(tokenId);
    }

    function _checkFees(uint256 coeff) internal {
        require(msg.value >= bundleBaseFee * coeff);

        uint256 amount = (msg.value / denominator) * doNftShare;
        doNftWallet.transfer(amount);

        // Contract owner's fee just remains on a contract, and could be withdrawn later
    }

    function _maybeSendFeeToEffectCreator(NFT memory token) internal {
        // Expected that _checkFees is already called.
        if (
            token.role == TokenRole.Modifier &&
            effectsAllowList != EffectsAllowList(address(0x0))
        ) {
            uint256 amount = (msg.value / denominator) * effectOwnerShare;
            payable(effectsAllowList.getByEffect(address(token.token)).owner)
                .transfer(amount);
        }
    }

    function _isBundledToken(NFT memory token) internal view returns (bool) {
        return _exists(token.tokenId) && address(token.token) == address(this);
    }

    function _maybeSetParent(NFT memory token, uint256 parentTokenId) internal {
        if (!_isBundledToken(token)) return;
        parentBundle[token.tokenId] = parentTokenId;
    }

    function _unsetParent(NFT memory token) internal {
        if (!_isBundledToken(token)) return;
        delete parentBundle[token.tokenId];
    }
}
