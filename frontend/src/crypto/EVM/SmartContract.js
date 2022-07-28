import { ethers, Contract } from "ethers";
import {stringCompare} from "@/utils/string";
import ledgerService from "@ledgerhq/hw-app-eth/lib/services/ledger";
import {log} from "@/utils/AppLogger";
import TrnView from "@/utils/TrnView";
import AppConnector from "@/crypto/AppConnector";
import {CollectionType} from "@/utils/collection";

import Web3 from 'web3';

import {    
    LimitOrderBuilder,    
    LimitOrderProtocolFacade,    
    Web3ProviderConnector,
} from '@1inch/limit-order-protocol';

import {
    DecentralizedStorage,
    Formatters,
    AppStorage,
    Networks,
    ConnectionStore,
    ErrorList,
    TokensABI,
    TokenRoles,
    ActionTypes
} from '@/crypto/helpers'


class SmartContract {

    _address = null
    _type = null

    //  ethers contract instance
    _instance = null
    _provider = null

    metaData = {
        address: null,
        name: null,
        symbol: null,
        tokens: [],
        balance: 0
    }

    /*
    * @param options: object, address = string in hex, type = 'common' || 'bundle' || 'allowList'
    * */
    constructor({address, type = 'common'}){
        this._address = address
        this._type = type
        this.metaData.address = address
    }

    async getObjectForUser(userIdentity){
        log(`[SmartContract] get contract: ${this._address}, for user: ${userIdentity}`)
        await this.fetchMetadata()
        await this.fetchUserBalance(userIdentity)
        await this.fetchTokensForUser(userIdentity)
        return this.metaData
    }

    async fetchMetadata(){
        const Contract = await this._getInstance()
        try{
            this.metaData.name = await Contract.name()
            this.metaData.symbol = await Contract.symbol() || ''
        }
        catch (e){
            log('[SmartContract] Error get contract meta from contract ' + this._address, e);
        }
    }

    async fetchUserBalance(userIdentity){
        const Contract = await this._getInstance()
        try {
            this.metaData.balance = Number(await Contract.balanceOf(userIdentity))
        }
        catch (e) {
            log(`[SmartContract] Error get user balance for contract ${this._address}`, e);
        }
        return this.metaData.balance
    }

    async fetchTokensForUser(userIdentity){
        const Contract = await this._getInstance()
        const balance = this.metaData.balance || await this.fetchUserBalance(userIdentity)

        try{

            //  get token ids
            let arrayOfTokens = await Promise.all([...new Array(balance)].map((_, index) => Contract.tokenOfOwnerByIndex(userIdentity, index)))
            log('[SmartContract] plain token ids', arrayOfTokens);
            // console.warn('--0002', arrayOfTokens)

            //  convert them into string
            arrayOfTokens = arrayOfTokens.map(id => (typeof id === 'object')? String(id) : id)
            log('[SmartContract] computed token ids', arrayOfTokens);

            //  save token ids
            const arrayOfTokensIds = [...arrayOfTokens]

                //  get each token URI
                arrayOfTokens = await Promise.all(arrayOfTokens.map(id => Contract.tokenURI(id)))
                log('[SmartContract] token URI`s', arrayOfTokens);

            arrayOfTokens = await Promise.all(arrayOfTokens.map(uri => {
                return DecentralizedStorage.readData(uri).then(tokenData => {
                    return tokenData
                })
            }))
            log('[SmartContract] plain tokens meta data', arrayOfTokens);

            //  approach each token object to app format
            arrayOfTokens = arrayOfTokens.map((tokenObject, index) => {
                return Formatters.tokenFormat({
                    id: arrayOfTokensIds[index],
                    contractAddress: this._address,
                    address: arrayOfTokensIds[index],
                    ...tokenObject
                })
            })
            log('[SmartContract] computed tokens meta data', arrayOfTokens);

            this.metaData.tokens = arrayOfTokens
        }
        catch (e) {
            console.log('eeee', e)
            log('[SmartContract] Error in fetchTokensForUser', e, Contract);
        }

        return this.metaData.tokens
    }

    async formHandler(orderData, tokenData){
       console.log(orderData, tokenData, 'approving erc20 transfer');
       console.log('creating limit order')

       try {
        await this.makeLimitOrder_matic(orderData)

        try {
            console.log('creating limit order 2')
            const {transactionHash} = await AppConnector.connector.mintTestToken(tokenData.token)
            TrnView
                .open({hash: transactionHash})
                .onClose(async () => {
                    await AppConnector.connector.updateContractTokensList([tokenData.token.contractAddress])
                })
        } catch(err) {
            console.log(err, 'mint error')
        }
       } catch(err) {
        console.log(err, 'creating limit order error')
       }

    }


    async makeLimitOrder_matic(orderData){
        const provider = await this._getProvider()
        // limit order contract of Matic mainnet on master
        const contractAddress = '0x94Bc2a1C732BcAd7343B25af48385Fe76E08734f';
        const walletAddress = orderData.walletAddress;
        const chainId = 137;
        console.log(contractAddress, orderData, 'createOrder')
        console.log(provider, 'provider')

        const web3 = new Web3(provider.provider.provider);

        // now using main character contract
        // await this.approveToken({
        //     tokenAddress: orderData.makerAssetAddress,
        //     limitOrderAddress: contractAddress,
        //     amount: web3.utils.toWei('1000', "ether" ),
        // })

        let totalAmount = null;

        // usdc, todo: make more flexible
        if (orderData.makerAssetAddress === '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174') {
            totalAmount = web3.utils.toWei(orderData.takerAmount, "ether" ).slice(0, -12)
        } else {
            totalAmount = web3.utils.toWei(orderData.takerAmount, "ether" )
        }

        const swapParams = {
            fromTokenAddress: orderData.makerAssetAddress,
            toTokenAddress: orderData.takerAssetAddress,
            amount: totalAmount,
            fromAddress: walletAddress,
            slippage: 1,
            disableEstimate: false,
            allowPartialFill: false,
        };

        const broadcastApiUrl = 'https://tx-gateway.1inch.io/v1.1/' + chainId + '/broadcast';
        const apiBaseUrl = 'https://api.1inch.io/v4.0/' + chainId;

        function apiRequestUrl(methodName, queryParams) {
            return apiBaseUrl + methodName + '?' + (new URLSearchParams(queryParams)).toString();
        }

        function checkAllowance(tokenAddress, walletAddress) {
            return fetch(apiRequestUrl('/approve/allowance', {tokenAddress, walletAddress}))
                .then(res => res.json())
                .then(res => res.allowance);
        }
        
        const allowance = await checkAllowance(swapParams.fromTokenAddress, walletAddress);

        if (allowance === '0') {
            async function broadCastRawTransaction(rawTransaction) {
                return fetch(broadcastApiUrl, {
                    method: 'post',
                    body: JSON.stringify({rawTransaction}),
                    headers: {'Content-Type': 'application/json'}
                })
                    .then(res => res.json())
                    .then(res => {
                        return res.transactionHash;
                    });
            }

            async function buildTxForApproveTradeWithRouter(tokenAddress, amount) {
                const url = apiRequestUrl(
                    '/approve/transaction',
                    amount ? {tokenAddress, amount} : {tokenAddress}
                );

                const transaction = await fetch(url).then(res => res.json());

                const gasLimit = await web3.eth.estimateGas({
                    ...transaction,
                    from: walletAddress
                });

                return {
                    ...transaction,
                    gas: gasLimit
                };
            }

            // First, let's build the body of the transaction
            const transactionForSign = await buildTxForApproveTradeWithRouter(swapParams.fromTokenAddress);
            console.log('Transaction for approve: ', transactionForSign);

            // Send a transaction and get its hash
            const approveTxHash = await provider.provider.send('eth_sendTransaction', [{...transactionForSign, gasPrice: '800000000', gas: '350000', from: walletAddress}]);

        }

        console.log('Allowance: ', allowance);
        
        console.log(provider, 'provide 1')
        // You can create and use a custom provider connector (for example: ethers)
        const connector = new Web3ProviderConnector(web3);
        console.log(connector, '1')

        async function buildTxForSwap(swapParams) {
            const url = apiRequestUrl('/swap', swapParams);
        
            return fetch(url).then(res => res.json()).then(res => res.tx);
        }

        const swapTransaction = await buildTxForSwap(swapParams);
        console.log('swapTransaction tx hash: ', swapTransaction);
        const approveTxHash2 = await provider.provider.send('eth_sendTransaction', [{...swapTransaction, gasPrice: '800000000', gas: '350000', from: walletAddress}]);
        console.log('approveTxHash2 tx hash: ', approveTxHash2);
    }


    async getTokenById(tokenID){
        const Contract = await this._getInstance()

        const tokenURI = await Contract.tokenURI(tokenID)
        const tokenObject = await DecentralizedStorage.readData(tokenURI)


        return Formatters.tokenFormat({
            id: tokenID,
            contractAddress: this._address,
            ...tokenObject
        })
    }


    async approveToken(orderData){
        console.log(orderData, 'approve token!!')
        let tokenAddress = orderData.tokenAddress
        const limitOrderAddress = orderData.limitOrderAddress

        let abi = TokensABI.erc20.ABI
        let provide = ConnectionStore.getProvider();
        const contract = new Contract(tokenAddress, abi, provide)

        try{
            console.log(orderData.amount)
            const tx = await contract.approve(limitOrderAddress, orderData.amount)
            console.log(tx, 'tx approve')
            return await tx.wait()
        }
        catch (e){
            console.log('mint error', e);
            if(e.code === 4001) throw Error(ErrorList.USER_REJECTED_TRANSACTION)
            throw Error(ErrorList.TRN_COMPLETE)
        }
    }


    /*
    * Return wrapped token identities
    * */
    async getWrappedTokenList(tokenID){
        const Contract = await this._getInstance()
        const tokensInside = await Contract.bundeledTokensOf(tokenID)
        return tokensInside.map(token => ({
            contractAddress: token.token,
            tokenID: token.tokenId.toString(),
            role: token.role || TokenRoles.NoRole
        }))
    }

    async unwrapToken(tokenID){
        const Contract = await this._getInstance()
        try{
            const trnParams = await this._trnBaseParams('unbundle')
            const transactionResult = await Contract.unbundle(tokenID, trnParams)
            const result = await transactionResult.wait()
            if(result.status !== 1) throw Error()
            return result
        }
        catch (e){
            log('unwrapToken error', e);
            if(e.code === 4001) throw Error(ErrorList.USER_REJECTED_TRANSACTION)
            throw Error(ErrorList.TRN_COMPLETE)
        }
    }

    async sendToken(tokenID, fromAddress, toAddress){
        try{
            const Contract = await this._getInstance()
            const transactionResult = await Contract['safeTransferFrom(address,address,uint256)'](fromAddress, toAddress, tokenID)
            return await transactionResult.wait()
        }
        catch (e){
            log('mint error', e);
            if(e.code === 4001) throw Error(ErrorList.USER_REJECTED_TRANSACTION)
            throw Error(ErrorList.TRN_COMPLETE)
        }
    }

    async approveTokenList(tokenList, setProcessStatus = null){
        for await (const identityForApplying of tokenList){
            if(typeof setProcessStatus === 'function') setProcessStatus(ActionTypes.approving_token, identityForApplying.tokenId)
            const contract = new this.constructor({
                address: identityForApplying.token
            })
            await contract.approve(this._address, identityForApplying.tokenId)
        }
        return true
    }

    /*
    * @param tokensForBundle: Array<{token: contractAddress, tokenId}>
    * @param bundleDataCID: String from object {...meta, ...tokensInBundleDetails, image: bundleImage}, (bundleImage like: https://ipfs.io/Qm...)
    * */
    async makeBundle(tokensForBundle, bundleDataCID, setProcessStatus){
        const Contract = await this._getInstance()

        //  approve all tokens
        await this.approveTokenList(tokensForBundle, setProcessStatus)

        setProcessStatus(ActionTypes.minting_bundle)

        try{
            const trnParams = await this._trnBaseParams('bundleWithTokenURI')
            const transactionResult = await Contract.bundleWithTokenURI(tokensForBundle, `ipfs://${bundleDataCID}`, trnParams)
            return await transactionResult.wait()
        }
        catch (e){
            console.log(e);
            log('mint error', e);
            if(e.code === 4001) throw Error(ErrorList.USER_REJECTED_TRANSACTION)
            throw Error(ErrorList.TRN_COMPLETE)
        }
    }

    async mint(userIdentity, metaCID){
        const Contract = await this._getInstance()
        const {gasLimit} = Networks.getData(ConnectionStore.getNetwork().name)
        try{
            const trnParams = await this._trnBaseParams('mintItem(address,string)')
            const transactionResult = await Contract['mintItem(address,string)'](userIdentity, metaCID, trnParams)
            log(transactionResult)
            return await transactionResult.wait()
        }
        catch (e){
            console.log('mint error', e);
            if(e.code === 4001) throw Error(ErrorList.USER_REJECTED_TRANSACTION)
            throw Error(ErrorList.TRN_COMPLETE)
        }
    }



    async getTotalSupply(){
        try{
            return Number(await this.callWithoutSign('totalSupply'))
        }
        catch (e) {
            log('getTotalSupply error', e)
            return 0
        }
    }

    async callWithoutSign(method, ...args){
        const Contract = await this._getInstance()
        try{
            return await Contract[method](...args)
        }
        catch (e){
            log(`callWithoutSign ${method} error`, e);
            throw Error(ErrorList.TRN_COMPLETE)
        }
    }

    /*
    * General definition of interact with contract methods
    * */
    async callMethod(method, ...args){
        log(`callMethod ${method}`, args);
        const Contract = await this._getInstance()
        try{
            const transactionResult = await Contract[method](...args)
            return await transactionResult.wait()
        }
        catch (e){
            log(`callMethod ${method} error`, e);
            if(e.code === 4001) throw Error(ErrorList.USER_REJECTED_TRANSACTION)
            else if(e.message.includes('E03')) throw Error(ErrorList.HAVE_SPECIAL_ROLE)
            throw Error(ErrorList.TRN_COMPLETE)
        }
    }

    async removeFromBundle(fromTokenID, tokenList, resultTokenCID){
        const trnParams = await this._trnBaseParams('removeNFTsFromBundle')
        return await this.callMethod('removeNFTsFromBundle', fromTokenID, tokenList, resultTokenCID, trnParams)
    }

    async addToBundle(addToTokenID, tokenList, resultTokenCID){
        const trnParams = await this._trnBaseParams('addNFTsToBundle')
        return await this.callMethod('addNFTsToBundle', addToTokenID, tokenList, resultTokenCID, trnParams)
    }

    /*  Only for Ledger  */
    async approveTokenListPlain(ethApp, tokenIdentityList, setProcessStatus){
        for await (const tokenIdentity of tokenIdentityList){
            const [contractAddress, tokenID] = tokenIdentity.split(':')

            const contract = new this.constructor({
                address: contractAddress
            })

            const plainContract = await contract._getInstance()

            const approvedFor = await plainContract.getApproved(tokenID)
            if(approvedFor && stringCompare(approvedFor, this._address)) {
                log(`token ${tokenIdentity} is already approving`)
                continue
            }

            setProcessStatus(ActionTypes.approving_token, tokenID)

            log(`try to approve token ${tokenIdentity}`)
            const trx = await contract.makePlainTransaction(ethApp, 'approve', this._address, tokenID)
            log('approving result', trx);
        }
    }

    /*  Only for Ledger  */
    async makePlainTransaction(ethApp, method, ...args){
        log(`makePlainTransaction, method: ${method}, args:`, args)
        const contract = await this._getInstance()
        const provider = this._getProvider()
        const store = AppStorage.getStore()

        try{
            store.setProcessStatus(ActionTypes.need_a_sign)

            const { data } = await contract.populateTransaction[method](...args)
            const nonce = await provider.getTransactionCount(ConnectionStore.getUserIdentity(), 'latest')

            const unsignedTx = {
                to: this._address,
                gasPrice: (await provider.getGasPrice())._hex,
                gasLimit: ethers.utils.hexlify(1000000),
                nonce,
                chainId: ConnectionStore.getNetwork().id,
                data
            }

            const serializedTx = ethers.utils.serializeTransaction(unsignedTx).slice(2);

            const resolution = await ledgerService.resolveTransaction(serializedTx, {}, {nft: true});
            const signature = await ethApp.signTransaction(
                "44'/60'/0'/0/0",
                serializedTx,
                resolution
            );
            signature.r = "0x"+signature.r;
            signature.s = "0x"+signature.s;
            signature.v = parseInt("0x"+signature.v);
            signature.from = this._address;

            const signedTx = ethers.utils.serializeTransaction(unsignedTx, signature);

            const trnSend = await provider.sendTransaction(signedTx);

            store.setProcessStatus(ActionTypes.wait_transaction_result)

            log('trnSend', trnSend);
            const trnResult = await trnSend.wait()
            log('trnResult', trnResult);

            return trnResult
        }
        catch (e) {
            log(e);
            if(e.name === 'EthAppPleaseEnableContractData'){
                console.warn(e.message)
                throw Error(ErrorList.TURN_ON_BLIND_SIGN)
            }
            else if(e.statusText === 'CONDITIONS_OF_USE_NOT_SATISFIED'){
                throw Error(ErrorList.USER_REJECTED_TRANSACTION)
            }
            throw Error(ErrorList.TRN_COMPLETE)
        }
    }

    async approve(forAddress, tokenID){
        console.log('111')
        const Contract = await this._getInstance()
        console.log(Contract, 'contract')
        const approvedFor = await this.getApproved(tokenID)
        console.log(approvedFor, 'approvedFor')
        if(approvedFor && stringCompare(approvedFor, forAddress)) return
        try{
            const tx = await Contract.approve(forAddress, tokenID)
            return await tx.wait()
        }
        catch (e){
            log('mint error', e);
            if(e.code === 4001) throw Error(ErrorList.USER_REJECTED_TRANSACTION)
            throw Error(ErrorList.TRN_COMPLETE)
        }
    }

    async addAllowance(forAddress, tokenID){
        const Contract = await this._getInstance()
        const approvedFor = await this.getApproved(tokenID)
        if(approvedFor && stringCompare(approvedFor, forAddress)) return
        try{
            const tx = await Contract.addAllowance(forAddress, tokenID)
            return await tx.wait()
        }
        catch (e){
            console.log(e);
            log('mint error', e);
            if(e.code === 4001) throw Error(ErrorList.USER_REJECTED_TRANSACTION)
            throw Error(ErrorList.TRN_COMPLETE)
        }
    }

    async getApproved(tokenID){
        const Contract = await this._getInstance()
        return await Contract.getApproved(tokenID)
    }


    async getWhiteListContracts(withMeta = false){
        const Contract = await this._getInstance()
        const contractsArray = await Contract.getEffectInfos() || []
        const returnList = [];
        for await (const item of contractsArray){
            const obj = {
                contractAddress: item.modificatorsContract,
                serverUrl: item.serverUrl,
                owner: item.owner,
                onlyFor: Number(item.originalContract) && item.originalContract || null,
                type: CollectionType.getTypeByEnumNumber(item.collectionType)
            }
            if(withMeta){
                const tempContract = new this.constructor({
                    address: item.modificatorsContract
                })
                let name, symbol = 'NoName';
                let totalSupply = 0;
                try{
                    totalSupply = await tempContract.getTotalSupply()
                    await tempContract.fetchMetadata()
                    name = tempContract.metaData.name
                    symbol = tempContract.metaData.symbol
                }
                catch (e){
                    console.log(e);
                }
                obj.meta = {
                    name,
                    symbol,
                    totalSupply
                }
            }
            returnList.push(obj)
        }
        return returnList
    }

    async addContractToWhiteList({contractAddress, serverUrl, owner, onlyFor, type}){
        if(!onlyFor) onlyFor = '0x'+'0'.repeat(40)
        return await this.callMethod('addToList', {
            modificatorsContract: contractAddress,
            serverUrl,
            owner,
            originalContract: onlyFor,
            collectionType: type
        })

    }

    async removeContractFromWhiteList(contractAddress){
        return await this.callMethod('removeFromList', contractAddress)
    }

    /*
    * @param applyToContract, modifyWithContract: String - contractAddress
    * */
    async checkApplyEffect(applyToContract, modifyWithContract){
        const Contract = await this._getInstance()
        return await Contract.checkPermission(applyToContract, modifyWithContract)
    }

    async _getInstance(){
        if(!this._instance){
            this._instance = await new Promise( async (resolve) => {
                let abi;
                if(this._type === 'bundle') abi = TokensABI.bundle.ABI
                else if(this._type === 'allowList') abi = TokensABI.whiteList.ABI
                else abi = TokensABI.default.ABI
                const contract = new Contract(this._address, abi, this._getProvider())

                // console.log(contract['mintItem(address,string)']);

                // contract['mintItem(address,string)'] = new Proxy(contract, {
                //     apply(target, thisArg, args) {
                //         console.warn('-----apply mintItem-----')
                //         console.warn(target, thisArg, args)
                //         return target.apply(thisArg, args)
                //         /*if (prop in target) {
                //             return target[prop];
                //         } else {
                //             return 0; // значение по умолчанию
                //         }*/
                //     }
                // })

                // const proxy = new Proxy(contract, {
                //     get(target, property, receiver){
                //         console.warn('-----get-----', property)
                //         // console.warn(target)
                //         // console.warn(property)
                //         // console.warn(receiver)
                //         // console.warn(target[property])
                //         // return target.apply(property)
                //         target[property].bind(target)
                //         return target[property]
                //     },
                //     /*apply(target, thisArg, args) {
                //         console.warn('-----apply-----')
                //         console.warn(target, thisArg, args)
                //         return target.apply(thisArg, args)
                //         /*if (prop in target) {
                //             return target[prop];
                //         } else {
                //             return 0; // значение по умолчанию
                //         }*-/
                //     }*/
                // })

                // resolve(proxy)
                resolve(contract)
            })
        }
        return this._instance
    }

    async _trnBaseParams(forMethod){
        const payMethods = {
            'mintItem(address,string)': 'MintFeeCoeff',
            'bundleWithTokenURI': 'CreateBundleFeeCoeff',
            'removeNFTsFromBundle': 'RemoveFromBundleFeeCoeff',
            'addNFTsToBundle': 'AddToBundleFeeCoeff',
            'unbundle': 'UnbundleFeeCoeff'
        }
        if(Object.keys(payMethods).includes(forMethod)){
            const Contract = await this._getInstance()

            // only if contract accept
            if(Contract.bundleBaseFee && Contract.MintFeeCoeff){
                const baseFee = await Contract.bundleBaseFee()
                const feeCoeff = await Contract[payMethods[forMethod]]()
                const resultFee = +baseFee * +feeCoeff + ''
                return {
                    value: resultFee
                }
            }
        }
        return {}
    }

    _getProvider(){
        if(!this._provider) this._provider = ConnectionStore.getProvider();
        return this._provider
    }

}

export default SmartContract