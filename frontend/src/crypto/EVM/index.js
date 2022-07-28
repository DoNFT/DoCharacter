import {
    API,
    Networks,
    ConnectionStore,
    Formatters,
    AppStorage,
    Token,
    DecentralizedStorage,
    TokenRoles, getErrorTextByCode
} from '@/crypto/helpers'
import SmartContract from '@/crypto/EVM/SmartContract.js'
import {CollectionType} from "@/utils/collection";
import {stringCompare} from "@/utils/string";
import alert from "@/utils/alert";
import {ethers} from "ethers";
import {log} from "@/utils/AppLogger";

class EVM {

    constructor(){

    }


    /* ---------- Connected methods ON  ----------  */
    async init(){
        return await this.connector.init(this)
    }
    async connectToWallet(value){
        return await this.connector.connectToWallet(value)
    }
    async disconnect(){
        return await this.connector.disconnect()
    }
    async isUserConnected(){
        return await this.connector.isUserConnected()
    }
    /*  ----------  Connected methods OFF  ----------  */

    async getProviderConnection(orderData, token){
        const {fetchAmount} = Networks.getData(ConnectionStore.getNetwork().name)

        const Contract = new SmartContract({
            address: fetchAmount
        })
        console.log(Contract, 'Contract')
        const provider = await Contract._getProvider()
        return provider
    }
    /*  ----------  Connected methods OFF  ----------  */

    async formHandler(orderData, token){
        const {fetchAmount} = Networks.getData(ConnectionStore.getNetwork().name)

        const Contract = new SmartContract({
            address: fetchAmount
        })
        console.log(orderData)
        Contract.formHandler(orderData, token)
    }

    async fetchUserTokens(){
        const storage = AppStorage.getStore()
        storage.changeCollectionLoadingState(true)

        const collections = []
        const whiteList = await this.getWhiteList({withMeta: true})

        const characters = await this._filterWhiteList(whiteList, CollectionType.CHARACTERS)
        for await (const character of characters){
            const things = await this._filterWhiteList(whiteList, CollectionType.THINGS, character.address)
            const colors = []
            for await (const thingContract of things){
                colors.splice(colors.length, 0, ...await this._filterWhiteList(whiteList, CollectionType.COLORS, thingContract.address))
            }
            const achievements = await this._filterWhiteList(whiteList, CollectionType.ACHIEVEMENTS, character.address)

            collections.push({
                character,
                things,
                colors,
                achievements
            })
        }

        storage.changeCollectionLoadingState(false)
        storage.setCollections(collections)
    }

    async _filterWhiteList(list, contractType, originatedFor = null){
        const filteredList = list.filter(contract => contract.type === contractType && ((originatedFor && stringCompare(contract.onlyFor, originatedFor)) || !originatedFor));
        const contracts = []
        for await (const contractPlain of filteredList){
            const contract = await this.getContractObject(contractPlain.contractAddress)
            contract.type = contractType
            contracts.push(contract)
        }
        return contracts
    }

    async getContractObject(address, byPlain = false){
        const userIdentity = ConnectionStore.getUserIdentity()
        const {api} = Networks.getSettings(ConnectionStore.getNetwork().name)
        if(api && !byPlain && +process.env.VUE_APP_OPENSEA_PROVIDER){
            console.log('getting contract by API')
            try{
                const tokens = await this.getContractTokens(address, byPlain)

                let contract = await API.fetchContract(address)
                contract = Formatters.contractFormat({
                    address,
                    tokens,
                    name: contract.name,
                    symbol: contract.symbol
                })

                return contract
            }
            catch (e) {
                console.log('getContractObject by API error', e)
                return await this.getContractObject(address, true)
            }
        }
        else {
            console.log('getting contract by plain')
            const contract = new SmartContract({
                address,
                type: 'bundle'
            })
            let contractObject = Formatters.contractFormat(await contract.getObjectForUser(userIdentity))
            contractObject.tokens = await this.addStructuresToTokenList(contractObject.tokens)
            return contractObject
        }
    }

    async getContractTokens(contractAddress, byPlain = false){
        const userIdentity = ConnectionStore.getUserIdentity()
        const {api} = Networks.getSettings(ConnectionStore.getNetwork().name)
        if(api && !byPlain && +process.env.VUE_APP_OPENSEA_PROVIDER){
            console.log('getting tokens by API', contractAddress)
            try{
                let tokens = await API.fetchUserTokensByContract(contractAddress, userIdentity)
                tokens = tokens.map(token => {
                    return Formatters.tokenFormat({
                        id: token.token_id,
                        contractAddress: contractAddress,
                        name: token.name,
                        image: token.image_url,
                        description: token.description,
                        link: token.permalink
                    })
                })

                return await this.addStructuresToTokenList(tokens)
            }
            catch (e){
                console.log('getContractObject by API error', e)
                return await this.getContractTokens(contractAddress, true)
            }
        }
        else {
            console.log('getting tokens by plain', contractAddress)
            const contract = new SmartContract({
                address: contractAddress,
                type: 'bundle'
            })

            const tokens = await contract.fetchTokensForUser(userIdentity)
            // console.warn('tokens return', tokens);
            return await this.addStructuresToTokenList(tokens)
        }
    }

    async addStructuresToTokenList(tokenList){
        for await (const token of tokenList){
            token.structure = await this.getTokenStructure(token)
        }
        return tokenList
    }

    async getTokenStructure(tokenObject) {
        if(Array.isArray(tokenObject.structure) && tokenObject.structure.length) return tokenObject.structure
        let returnTokens = []

        try{
            returnTokens = await this.getWrappedTokensObjectList(tokenObject.contractAddress, tokenObject.id)
            for await (const token of returnTokens){
                token.structure = await this.getTokenStructure(token)
            }
        }
        catch (e){
            console.log('getTokenStructure error', e);
        }

        return returnTokens
    }

    async getWrappedTokensObjectList(contractAddress, tokenID){
        const contract = new SmartContract({
            address: contractAddress,
            type: 'bundle'
        })
        const wrappedTokens = await contract.getWrappedTokenList(tokenID)
        const wrappedTokenIdentities = wrappedTokens.map(token => `${token.contractAddress}:${token.tokenID}`)
        const tokenObjectList = await this.getTokenListByIdentity(wrappedTokenIdentities, false)

        tokenObjectList.forEach(token => {
            const findInPlain = wrappedTokens.find(t => stringCompare(token.identity, `${t.contractAddress}:${t.tokenID}`))
            token.tokenRole = findInPlain.role
        })

        return tokenObjectList
    }


    async mintTestToken({cid, contractAddress}){
        console.log(cid, contractAddress, 'MINT TEST')
        const contract = new SmartContract({
            address: contractAddress,
            type: 'bundle'
        })
        return await contract.mint(ConnectionStore.getUserIdentity(), cid)
    }

    async updateContractTokensList(list) {
        try{
            await Promise.all(list.map(address => this.updateContractTokens(address)))
        }
        catch (e) {
            console.log('updateContractTokensList', e);
        }
    }

    async updateContractTokens(contractAddress){
        const storage = AppStorage.getStore()
        try{
            storage.changeContractUpdating(contractAddress, true)
            const tokens = await this.getContractTokens(contractAddress, true)
            storage.updateContractTokens(contractAddress, tokens)
        }
        catch (e) {
            console.log('updateContractTokens', e);
        }
        finally {
            storage.changeContractUpdating(contractAddress, false)
        }
    }

    // @param assetType: string 'things' || 'colors'
    async applyAssetsToToken_old(original, modifiers, assetType = 'things'){
        console.log('applyAssetsToToken', original, modifiers);

        const {url, blob} = await Token.applyAssets(original, modifiers, assetType)

        const metaCID = DecentralizedStorage.loadJSON({
            name: original.name,
            description: original.description,
            link: original.link,
            image: url
        })

        const tokensForBundleIdentity = modifiers.map(token => token.identity)
        const tokenIdentityObjectList = Token.transformIdentitiesToObjects(tokensForBundleIdentity)
        const tokensForBundle = Token.addTokenRole(tokenIdentityObjectList)

        return {
            contractAddress: original.contractAddress,
            tokensForBundle,
            tokensForBundleIdentity,
            metaCID,
            tempImage: blob
        }
    }

    async applyNumber(originalToken, contentURI){
        let addNumber = 0
        try{
            const chain = 'ETH';
            const userIdentity = ConnectionStore.getUserIdentity();
            const contractAddress = '0x111111111117dc0aa78b770fa6a738034120c302';
            const resp = await fetch(
                `https://api-eu1.tatum.io/v3/blockchain/token/balance/${chain}/${contractAddress}/${userIdentity}`,
                {
                    method: 'GET',
                    headers: {
                        'x-testnet-type': 'ethereum-rinkeby',
                        'x-api-key': '9d0210f4-6007-4225-bed6-b1d0af36d832'
                    }
                }
            );
            const data = await resp.json();
            addNumber = data.balance
        }
        catch (e) {
            console.log(e);
        }

        const {url, blob, cid} = await Token.addNumberToToken(
            {
                contractAddress: originalToken.contractAddress,
                tokenID: originalToken.id,
                contentURI
            },
            addNumber
        )
        return {
            url,
            blob,
            cid
        }
    }

    async createBundle(original, modifiers, assetType){
        console.log('createBundle', original, modifiers);
        const originImage = original.originImage || original.image

        const storage = AppStorage.getStore()

        const resultModifiers = modifiers.map(Token.computeModifyObject)
        const resultModifiersForImage = resultModifiers
            .filter(token => {
                const isFind = storage.findContractObject(token.contractAddress)
                return isFind && isFind.contract.type !== CollectionType.ACHIEVEMENTS || false
            })

        let {url, blob, cid} = await Token.applyAssets(
            {
                contractAddress: original.contractAddress,
                tokenID: original.id,
                contentUrl: originImage
            },
            resultModifiersForImage,
            assetType
        )

        if(assetType === 'things'){
            ({url, blob, cid} = await this.applyNumber(original, url))
        }

        const metaCID = await DecentralizedStorage.loadJSON({
            name: original.name,
            description: original.description,
            link: original.link,
            image: url,
            originImage
        })

        const computedTokenList = Token.addTokenRole(
            Token.transformIdentitiesToObjects([original.identity].concat(modifiers.map(t => t.identity))),
            {
                originalIdentities: [original.identity],
            }
        )

        return {
            resultTokenCID: metaCID,
            contractAddress: original.contractAddress,
            tokensList: computedTokenList,
            tempImage: blob,
            permanentImage: url
        }
    }

    // @param assetType: string 'things' || 'colors'
    async applyAssetsToToken(original, modifiers, assetType = 'things'){
        const originalToken = await this.getTokenByIdentity(original.identity, true, true)
        const storage = AppStorage.getStore()

        const allInsideTokens = originalToken.structure
            .map(Token.computeModifyObject)
            .concat(modifiers.map(Token.computeModifyObject))

        const resultModifiersForImage = allInsideTokens
            .filter(token => {
                const isFind = storage.findContractObject(token.contractAddress)
                return isFind && token.tokenRole !== TokenRoles.Original && isFind.contract.type !== CollectionType.ACHIEVEMENTS || false
            })

        const originImage = originalToken.originImage || originalToken.image

        let {url, blob, cid} = await Token.applyAssets(
            {
                contractAddress: original.contractAddress,
                tokenID: original.id,
                contentUrl: originImage
            },
            resultModifiersForImage,
            assetType
        )

        if(assetType === 'things'){
            let addNumber = 0
            try{
                const chain = 'ETH';
                const userIdentity = ConnectionStore.getUserIdentity();
                const contractAddress = '0x111111111117dc0aa78b770fa6a738034120c302';
                const resp = await fetch(
                    `https://api-eu1.tatum.io/v3/blockchain/token/balance/${chain}/${contractAddress}/${userIdentity}`,
                    {
                        method: 'GET',
                        headers: {
                            'x-testnet-type': 'ethereum-rinkeby',
                            'x-api-key': '9d0210f4-6007-4225-bed6-b1d0af36d832'
                        }
                    }
                );
                const data = await resp.json();
                addNumber = data.balance
            }
            catch (e) {
                console.log(e);
            }

            ({url, blob, cid} = await Token.addNumberToToken(
                {
                    contractAddress: originalToken.contractAddress,
                    tokenID: originalToken.id,
                    contentURI: url
                },
                addNumber
            ))
        }

        const metaCID = await DecentralizedStorage.loadJSON({
            name: originalToken.name,
            description: originalToken.description,
            link: originalToken.link,
            image: url,
            originImage
        })

        const computedTokenList = Token.addTokenRole(Token.transformIdentitiesToObjects(modifiers.map(t => t.identity)))

        return {
            resultTokenCID: metaCID,
            toTokenID: original.id,
            contractAddress: original.contractAddress,
            addTokenList: computedTokenList,
            // tokensForBundle,
            // tokensForBundleIdentity,
            // metaCID,
            tempImage: blob,
            permanentImage: url
        }
    }

    async removeAssetsFromBundle(original, removed, assetType = 'things'){
        const originalToken = await this.getTokenByIdentity(original.identity, true, true)

        const storage = AppStorage.getStore()

        const allInsideTokens = originalToken.structure
            .filter(token => !stringCompare(token.identity, removed.identity))
            .map(Token.computeModifyObject)

        const resultModifiersForImage = allInsideTokens
            .filter(token => {
                const isFind = storage.findContractObject(token.contractAddress)
                return isFind && token.tokenRole !== TokenRoles.Original && isFind.contract.type !== CollectionType.ACHIEVEMENTS || false
            })

        const originImage = originalToken.originImage || originalToken.image

        const computedRemovedTokenList = Token.addTokenRole(Token.transformIdentitiesToObjects([removed].map(t => t.identity)))

        if(!resultModifiersForImage.length){
            const metaCID = await DecentralizedStorage.loadJSON({
                name: originalToken.name,
                description: originalToken.description,
                link: originalToken.link,
                image: originImage
            })
            return {
                resultTokenCID: metaCID,
                fromTokenID: original.id,
                contractAddress: original.contractAddress,
                tempImage: originImage,
                permanentImage: originImage,
                cid: originImage,
                computedRemovedTokenList
            }
        }

        let {url, blob, cid} = await Token.applyAssets(
            {
                contractAddress: original.contractAddress,
                tokenID: original.id,
                contentUrl: originImage
            },
            resultModifiersForImage,
            assetType
        )

        if(assetType === 'things'){
            let addNumber = 0
            try{
                const chain = 'ETH';
                const userIdentity = ConnectionStore.getUserIdentity();
                const contractAddress = '0x111111111117dc0aa78b770fa6a738034120c302';
                const resp = await fetch(
                    `https://api-eu1.tatum.io/v3/blockchain/token/balance/${chain}/${contractAddress}/${userIdentity}`,
                    {
                        method: 'GET',
                        headers: {
                            'x-testnet-type': 'ethereum-rinkeby',
                            'x-api-key': '9d0210f4-6007-4225-bed6-b1d0af36d832'
                        }
                    }
                );
                const data = await resp.json();
                addNumber = data.balance
            }
            catch (e) {
                console.log(e);
            }

            ({url, blob, cid} = await Token.addNumberToToken(
                {
                    contractAddress: originalToken.contractAddress,
                    tokenID: originalToken.id,
                    contentURI: url
                },
                addNumber
            ))
        }

        const metaCID = await DecentralizedStorage.loadJSON({
            name: originalToken.name,
            description: originalToken.description,
            link: originalToken.link,
            image: url,
            originImage
        })

        return {
            resultTokenCID: metaCID,
            fromTokenID: original.id,
            contractAddress: original.contractAddress,
            tempImage: blob,
            permanentImage: url,
            cid,
            computedRemovedTokenList
        }
    }


    async checkForENSName(address){
        if(ethers.utils.isAddress(address)){
            return {
                realAddress: address,
                ensName: address
            }
        }
        else{
            let realAddress;
            try{
                realAddress = await ConnectionStore.getProviderForENS().resolveName(address)
            }
            catch (e){
                log(e)
                throw new Error('CONTRACT_ADDRESS_ERROR')
            }
            if(realAddress && ethers.utils.isAddress(realAddress)){
                return {
                    realAddress: realAddress,
                    ensName: address
                }
            }
            else {
                throw new Error('CONTRACT_ADDRESS_ERROR')
            }
        }
    }

    async sendNFT(tokenObject, toAddressPlain) {
        console.log('sendNFT', tokenObject, toAddressPlain);

        const {realAddress: toAddress} = await this.checkForENSName(toAddressPlain)
        const [contractAddress, tokenID] = tokenObject.identity.split(':')
        const fromAddress = ConnectionStore.getUserIdentity()
        if(stringCompare(fromAddress, toAddress)) throw Error('THE_SAME_ADDRESS_ERROR')

        console.log(`[Send NFT] contract: ${contractAddress}, token: ${tokenID}, from: ${fromAddress}, to: ${toAddress}`)

        const Contract = new SmartContract({
            address: contractAddress
        })
        return await Contract.sendToken(tokenID, fromAddress, toAddress)
    }

    async approve(tokenObject, toAddressPlain) {
        const {realAddress: forAddress} = await this.checkForENSName(toAddressPlain)
        const [contractAddress, tokenID] = tokenObject.identity.split(':')
        const fromAddress = ConnectionStore.getUserIdentity()
        if(stringCompare(fromAddress, forAddress)) throw Error('THE_SAME_ADDRESS_ERROR')

        const Contract = new SmartContract({
            address: contractAddress,
            type: 'bundle'
        })
        const trnResult = await Contract.approve(forAddress, tokenID)
        if(!trnResult) throw Error('ALREADY_APPROVED')
        return trnResult
    }

    async makeAllow(tokenObject, toAddressPlain){
        const {realAddress: forAddress} = await this.checkForENSName(toAddressPlain)
        const [contractAddress, tokenID] = tokenObject.identity.split(':')
        const fromAddress = ConnectionStore.getUserIdentity()
        if(stringCompare(fromAddress, forAddress)) throw Error('THE_SAME_ADDRESS_ERROR')

        const Contract = new SmartContract({
            address: contractAddress,
            type: 'bundle'
        })
        const trnResult = await Contract.addAllowance(forAddress, tokenID)
        if(!trnResult) throw Error('ALREADY_ALLOWED')
        return trnResult
    }

    async isApproved(tokenObject){
        const [contractAddress, tokenID] = tokenObject.identity.split(':')
        const Contract = new SmartContract({
            address: contractAddress
        })
        const approvedFor = await Contract.getApproved(tokenID)
        return approvedFor && stringCompare(approvedFor, ConnectionStore.getUserIdentity())
    }


    tryToConnectToUnsupportedNetwork(){
        console.log('network not supported')
        alert.open('Sorry, we did not support this network')
    }

    /*  White list ON  */
    async getWhiteList({withUpdate = false, withMeta = false} = {}){
        const storage = AppStorage.getStore()
        if(!storage.whiteList.length || withUpdate) {
            try{
                storage.changeWhiteListLoadingState(true)
                const {whiteListContract} = Networks.getSettings(ConnectionStore.getNetwork().name)
                const contract = new SmartContract({
                    address: whiteListContract,
                    type: 'allowList'
                })

                const list = await contract.getWhiteListContracts(withMeta)
                storage.setWhiteList(list)
            }
            catch (e) {
                console.log('Get whiteList error', e)
            }
            finally {
                storage.changeWhiteListLoadingState(false)
            }
        }
        return storage.whiteList
    }

    async addContractToWhiteList(form){
        const {realAddress: formContractAddress} = await this.checkForENSName(form.contractAddress)
        form.contractAddress = formContractAddress
        const {whiteListContract} = Networks.getSettings(ConnectionStore.getNetwork().name)
        const contract = new SmartContract({
            address: whiteListContract,
            type: 'allowList'
        })
        return await contract.addContractToWhiteList(form)
    }

    async removeContractFromWhiteList(contractAddress){
        const {whiteListContract} = Networks.getSettings(ConnectionStore.getNetwork().name)
        const contract = new SmartContract({
            address: whiteListContract,
            type: 'allowList'
        })
        return await contract.removeContractFromWhiteList(contractAddress)
    }
    /*  White list OFF  */


    async deployOwnContract(){}



    /*  ----------  Getters ON  ----------  */

    async getTokenListByIdentity(identityList, fetchStructure = true){
        const r = []
        for await (const identity of identityList){
            const token = await this.getTokenByIdentity(identity, undefined, fetchStructure)
            r.push(token)
        }
        return r
        // return await Promise.all(identityList.map(identity => this.getTokenByIdentity(identity, undefined, fetchStructure)))
    }

    /*
    * Return token object by identity
    * @param identity: TokenIdentity
    * */
    async getTokenByIdentity(identity, byPlain = false, fetchStructure = true){
        const userIdentity = ConnectionStore.getUserIdentity()

        const {api} = Networks.getSettings(ConnectionStore.getNetwork().name)
        if(api && !byPlain && +process.env.VUE_APP_OPENSEA_PROVIDER){
            console.log('getting token by API')
            try{
                let token = await API.fetchToken(identity, userIdentity)
                token = Formatters.tokenFormat({
                    id: token.token_id,
                    contractAddress: identity.split(':')[0],
                    name: token.name,
                    image: token.image_url,
                    description: token.description,
                    link: token.permalink
                })
                if(fetchStructure) {
                    token.structure = await this.getTokenStructure(token)
                    token.structureReady = true
                }
                return token
            }
            catch (e){
                console.log('getTokenByIdentity by API error', e)
                return await this.getTokenByIdentity(identity, true)
            }
        }
        else {
            console.log('getting token by plain')
            const contract = new SmartContract({
                address: identity.split(':')[0]
            })
            const token = await contract.getTokenById(identity.split(':')[1])
            if(fetchStructure) {
                token.structure = await this.getTokenStructure(token)
                token.structureReady = true
            }
            return token
        }
    }

    /*  ----------  Getters OFF  ----------  */



    /*  ----------  Actions ON  ----------  */

    async addUserContract(plainAddress, addWithoutTokensLoading = false) {}

    /*
    * Apply effect to token
    * @param {object} token - common token object like {id (Number), address (0x...), identity, name, image, ?attributes, ?external_url}
    * @param {object} effect - common token object
    * @param {object} meta - {name, description, link}
    * @return {object} like {transactionResult, provider}
    * */
    async applyEffectToToken({token, effect, meta}){}

    /*
    * Make tokens bundle
    * @param {array} tokens - array of common token objects like {id (Number), address (0x...), identity, name, image, ?attributes, ?external_url}
    * @param {object} meta - {name, description, link}
    * @param {object} ?image - instance of Blob (File)
    * @return {object} like {transactionResult, provider}
    * */
    async makeTokensBundle({tokens, meta, image = null}){}

    /*  Mass creating ON  */
    /*
    * @param contractAddress: String
    * @param tokenList: Array of token: {id, meta: {...}, image: Blob || string, imageTempURL: string, systemMeta: {state, transactionHash, errors, process, savedTokenDataCID}}
    * */
    // async* minTokensFromList(contractAddress, tokenList){
    minTokensFromListCover(contractAddress, tokenList){}

    /*
    * Try again to mint token
    * */
    async createMassTokenAgain(token){}

    async createTokensFromList(contractAddress, tokenList){}
    /*  Mass creating OFF  */

    async createNewToken({meta, image = null, contractAddress}){}

    async unwrap(tokenID) {}


    /*
    * Add tokens to bundle
    * @param addToTokenID:number - token id to what token new list of tokens mast be added
    * @param tokenList:Array<tokenIdentity> of token identities which must be added to bundle
    * */
    async addToBundle(addToTokenID, tokenList = []){}

    async removeFromBundle(fromTokenID, tokenList = []){}



    /*  -------- Effects white list ON --------  */

    // get or update effect contract list
    async getEffectContractList(){}

    /*
    * @param formObject: Object (see structure of object in SmartContract.js)
    * */
    async addContractToAllowEffectList(formObject){}

    async removeContractFromAllowEffectList(contractAddress){}

    /*  -------- Effects white list OFF --------  */
}

export default EVM