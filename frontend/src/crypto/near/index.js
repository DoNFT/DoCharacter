import store from "@/crypto/near/store";
import * as API from 'near-api-js'

import contracts from "@/crypto/near/contracts";
import {log} from "@/utils/AppLogger";
import {clearSavedProcess, getSavedProcess, saveBeforeAction} from "@/crypto/near/beforeActionStore";

import router from "@/router";

import {stringCompare} from "@/utils/string";
import {applyEffect, computeMediaForToken} from "@/crypto/near/createTokenHelper";
import {getConfigs, getConfigsForWalletConnect} from "@/crypto/near/connectedOptions";
import {
    getBundleContractInstance,
    getCollectionFactoryContractInstance,
    getContractInstance,
    getWhiteListContractInstance
} from "@/crypto/near/contractInstanceManager";
import {getTokensByAccountId} from "@/crypto/near/API";
import {CollectionType} from "@/utils/collection";
import {
    AppStorage,
    ConnectionStore,
    Networks,
    ErrorList,
    Formatters,
    ActionTypes,
    TokenRoles,
    Token, DecentralizedStorage
} from "@/crypto/helpers";
import SmartContract from "@/crypto/EVM/SmartContract";
import TrnView from "@/utils/TrnView";
import alert from "@/utils/alert";
import symbolKeys from "@/utils/symbolKeys";
import SymbolKeys from "@/utils/symbolKeys";

class NearConnector {

    nearGas = "100000000000000000000000"
    attachedGas = "300000000000000"
    deployCollectionGas = "6500000000000000000000000"

    _connector = null
    _isTokensFetched = false
    _isEffectsFetched = false
    ensNamesAvailable = false

    account = null
    AccountInstance = null

    constructor(){

    }

    async disconnect(){
        store.state.walletConnection.signOut()
        setTimeout(() => location.reload())
    }

    async connectToWallet(){
        log('Login to near')
        const wallet = store.state.walletConnection
        const {contract, title} = getConfigsForWalletConnect()
        if(!wallet.isSignedIn()) await wallet.requestSignIn(contract, title)
    }

    async init(){
        if(store.state.walletConnection) return store.state.accountId
        store.setLoading(true)
        log('Init near')

        const connectOptions = getConfigs()
        const near = await API.connect(connectOptions)
        const wallet = new API.WalletConnection(near, process.env.VUE_APP_NETWORK)

        store.setNearInstance(near)
        store.setWalletConnection(wallet)

        if(wallet.isSignedIn()){
            const accountId = wallet.getAccountId()

            this.AccountInstance = await near.account(accountId)

            store.setAccountId(accountId)

            ConnectionStore.setNetwork(`near_${near.connection.networkId}`, null, true)
            ConnectionStore.setUserIdentity(accountId)
            ConnectionStore.setDisconnectMethod(() => {
                wallet.signOut()
                location.reload()
            })

            this.checkTransactions()
                .then(() => {
                    router.replace({query: undefined})
                })

            log('User connected', accountId)
            // router.replace({query: undefined})
            this.fetchUserTokens()
        }
        else log('User not connected')
        return true
    }

    async checkTransactions() {
        const tx_hash = this.haveTransactionInURL()
        if(tx_hash){
            const {isSuccess, callAction} = await this.readTransaction(tx_hash)
            if(isSuccess){
                if(callAction === 'mint'){
                    const savedAction = this.getSavedProcess()
                    if(savedAction){
                        this.clearSavedProcess()
                        TrnView.open({hash: tx_hash})
                    }
                }
                else if(['add_token_to_bundle', 'remove_token_from_bundle', 'remove_token_from_bundle_metadata', 'add_token_to_bundle_metadata'].includes(callAction)){
                    TrnView.open({hash: tx_hash})
                }
            }
        }

        const tx_error = this.haveTransactionErrorURL()
        if(tx_error){
            alert.open(tx_error.message)
        }
    }

    nearProvider = null
    getNearProvider(){
        if(!this.nearProvider) {
            this.nearProvider = new API.providers.JsonRpcProvider(
                contracts.tokens.nodeUrl
            )
        }
        return this.nearProvider
    }

    cachedCustomContracts = {}
    async getCustomContract(contractName){
        if(!this.cachedCustomContracts[contractName]){
            const contractOptions = contracts[contractName]
            const connectOptions = {
                deps: {
                    keyStore: new API.keyStores.BrowserLocalStorageKeyStore()
                },
                ...contractOptions
            }
            const near = await API.connect(connectOptions)
            const wallet = new API.WalletConnection(near)

            this.cachedCustomContracts[contractName] = await new API.Contract(
                wallet.account(),
                contractOptions.contractName,
                {
                    // View methods are read only. They don't modify the state, but usually return some value.
                    viewMethods: ['nft_total_supply', 'nft_tokens_for_owner'],
                    // Change methods can modify the state. But you don't receive the returned value when called.
                    changeMethods: ['nft_mint', 'nft_transfer', 'nft_approve', 'nft_bundle', 'nft_unbundle'],
                }
            )
        }
        return this.cachedCustomContracts[contractName]
    }

    contractInstanceEffects = null
    async getEffectsContract(){
        if(!this.contractInstanceEffects){
            const connectOptions = {
                deps: {
                    keyStore: new API.keyStores.BrowserLocalStorageKeyStore()
                },
                ...contracts.effects
            }
            const near_nft_effects = await API.connect(connectOptions)
            const nftEffectsWallet = new API.WalletConnection(near_nft_effects)

            this.contractInstanceEffects = await new API.Contract(
                nftEffectsWallet.account(),
                contracts.effects.contractName,
                {
                    changeMethods: ['nft_mint', 'nft_bundle', 'nft_unbundle', 'nft_approve', 'nft_transfer']
                }
            )
        }
        return this.contractInstanceEffects
    }

    contractInstanceBundle = null
    async getBundleContract(){
        if(!this.contractInstanceBundle){
            const connectOptions = {
                deps: {
                    keyStore: new API.keyStores.BrowserLocalStorageKeyStore()
                },
                ...contracts.bundle
            }
            const near_bundle = await API.connect(connectOptions)
            const wallet = new API.WalletConnection(near_bundle)

            this.contractInstanceBundle = await new API.Contract(
                wallet.account(),
                contracts.bundle.contractName,
                {
                    changeMethods: ['nft_mint', 'nft_bundle', 'nft_unbundle', 'nft_approve', 'nft_transfer'],
                }
            )
        }
        return this.contractInstanceBundle
    }


    async getAccount(){
        if(!this.account) this.account = await store.state.nearInstance.account(ConnectionStore.getUserIdentity())
        return this.account
    }

    async isUserConnected(){
        const wallet = store.state.walletConnection
        if(wallet && wallet.isSignedIn()) return ConnectionStore.getUserIdentity()
        throw new Error(ErrorList.USER_NOT_CONNECTED)
    }

    async checkForENSName(address){
        return {
            realAddress: address,
            ensName: address
        }
    }

    async fetchUserTokens({withUpdate = true} = {}){
        const store = AppStorage.getStore()
        if (!withUpdate && store.getCollections.length) return store.getCollections
        store.changeCollectionLoadingState(true)

        // const resultContracts = new Set()
        //
        // let userContracts = []
        // const accountID = ConnectionStore.getUserIdentity()
        // try{
        //     userContracts = await getTokensByAccountId(accountID)
        // }
        // catch (e) {
        //     log('Fetching tokens error', e)
        //     store.changeCollectionLoadingState(false)
        //     throw new Error(ErrorList.NETWORK_ERROR)
        // }
        //
        //
        // // compute default contracts (bundle, effect, test)
        // const defaultContracts = []

        const collections = []

        const whiteList = await this.getWhiteList({withUpdate: true})

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


        // const userContractsWithTokens = await this.getContractWithTokensList([...resultContracts].filter(c => !exclude.includes(c)))

        store.changeCollectionLoadingState(false)
        store.setCollections(collections)

        this._isTokensFetched = true

        return collections
    }

    /*async getUserEffects({updateCache = false} = {}) {
        const store = AppStorage.getTokensStore()
        if(this._isEffectsFetched && !updateCache) return store.effects
        store.changeEffectsLoading(true)
        const effects = await this.getContractWithTokensList([contracts.effects.contractName])
        store.changeEffectsLoading(false)
        store.setEffects(effects)
        this._isEffectsFetched = true
        return effects
    }*/

    // async addUserContract(address) {
    //     const store = AppStorage.getTokensStore()
    //     if(store.isContractAlreadyAdded(address)) throw new Error(ErrorList.CONTRACT_EXIST)
    //     const computedContract = await this.getContractWithTokens(address)
    //     if(!computedContract) throw new Error(ErrorList.CONTRACT_NOT_FOUND)
    //
    //     // await customContractsStore.add(address, ConnectionStore.getNetwork().name)
    //
    //     store.addContract(computedContract)
    //     return true
    // }


    async getTokensFromContract(contractAddress){
        try{
            const tokens = await this.AccountInstance.viewFunction(
                contractAddress,
                'nft_tokens_for_owner',
                {
                    account_id: ConnectionStore.getUserIdentity(),
                    // limit: 30
                }
            )
            const computedTokens = []
            for await (const token of tokens) {
                computedTokens.push(await this.computedTokenObject(token, contractAddress))
            }
            return computedTokens
        }
        catch (e) {
            log('getTokensFromContract Error', e)
            throw new Error(ErrorList.ACCOUNT_TOKENS_READING)
        }
    }

    async getContractWithTokens(contractAddress, type = null){
        try {
            const tokens = await this.getTokensFromContract(contractAddress)

            return Formatters.contractFormat({
                address: contractAddress,
                tokens,
                type
            })
        } catch(e) {
            log('accountContracts err', e)
            throw new Error(ErrorList.ACCOUNT_TOKENS_READING)
        }
    }

    async getContractWithTokensList(contracts = []) {
        return Promise.all(contracts.map(contractAddress => this.getContractWithTokens(contractAddress)))
    }

    async getTokenByIdentity(identity){
        log('Get token by identity', identity)
        const [contractAddress, tokenID] = identity.split(':')
        if(contractAddress && tokenID){
            const contractsList = await this.fetchUserTokens({withUpdate: false});
            const contract = contractsList.find(c => c.address === contractAddress)
            if(contract) return contract.tokens.find(t => t.id === tokenID)
        }
        return null
    }

    async computedTokenObject(tokenOrigin, contractAddress, tokenRole = TokenRoles.NoRole) {
        const tokenComputed = Formatters.tokenFormat({
            id: tokenOrigin.token_id,
            contractAddress,
            name: tokenOrigin.metadata.title,
            image: tokenOrigin.metadata.media,
            description: tokenOrigin.metadata.description,
            specificAdditionFields: {
                approved_account_ids: tokenOrigin.approved_account_ids,
                insideTokens: tokenOrigin.bundles,
                tokenRole
            },
            originTokenObject: tokenOrigin
        })
        tokenComputed.structure = await this.getWrappedTokensObjectList(tokenComputed)
        return tokenComputed
    }

    async findTokenByIdentity(identity) {
        const [contractAddress, tokenID] = identity.split(':')
        if(contractAddress && tokenID){
            try{
                const contract = await getBundleContractInstance(contractAddress)
                const tokens = await contract.nft_tokens(0, 100)
                const findToken = tokens.find(token => stringCompare(token.token_id, tokenID))
                if (findToken) return await this.computedTokenObject(findToken, contractAddress)
            }
            catch (e) {
                log('Find token error', e)
            }
        }
        return null
    }

    // async getTokenListByIdentity(identityList, tokenType = 'user'){
    async getTokenListByIdentity(identityList){
        return await Promise.all(identityList.map(async tokenIdentity => await this.getTokenByIdentity(tokenIdentity)))
    }

    async isContractBundle(contractAddress){
        const whiteList = await this.getWhiteList()
        const isInWhiteList = whiteList.find(contract => stringCompare(contract.contractAddress, contractAddress))
        if(isInWhiteList) return isInWhiteList.type === CollectionType.bundle
        return false
    }





    // prevTransactionError = null
    haveTransactionErrorURL(){
        // if(this.prevTransactionError) return this.prevTransactionError
        const url = new URL(document.location)
        const errorCode = url.searchParams.get('errorCode')
        const errorMessage = url.searchParams.get('errorMessage')
        if(errorCode) {
            const savedProcess = getSavedProcess()
            const errorObject = {
                code: errorCode,
                message: errorMessage? decodeURIComponent(errorMessage) : errorCode,
                savedProcess
            }
            this.prevTransactionError = errorObject
            router.replace({query: undefined})
            return errorObject
        }
        else return undefined
    }
    haveTransactionInURL(){
        const url = new URL(document.location)
        return url.searchParams.get('transactionHashes')
    }
    async readTransaction(tx_hash){
        log('readTransaction', tx_hash);
        let isSuccess = false
        let callAction = null
        let trnResult = await this.getNearProvider().txStatus(tx_hash, ConnectionStore.getUserIdentity())

        if(trnResult && 'SuccessValue' in trnResult.status){
            isSuccess = true
            if(trnResult.transaction.actions[0] && trnResult.transaction.actions[0].FunctionCall){
                switch(trnResult.transaction.actions[0].FunctionCall.method_name) {
                    case 'nft_approve':
                        callAction = 'approve'
                        break
                    case 'nft_bundle':
                    case 'nft_bundle_with_approve':
                        callAction = 'bundle'
                        break
                    case 'nft_mint':
                        callAction = 'mint'
                        break
                    case 'nft_transfer':
                        callAction = 'transfer'
                        break
                    case 'nft_unbundle':
                        callAction = 'unbundle'
                        break
                    case 'remove_effect_contract_from_list':
                        callAction = 'remove_contract_from_white_list'
                        break
                    case 'add_effect_contract_to_list':
                        callAction = 'add_contract_to_white_list'
                        break
                    case 'create_store':
                        callAction = 'deploy_collection'
                        break
                    case 'add_token_to_bundle':
                    case 'add_token_to_bundle_metadata':
                        callAction = 'add_token_to_bundle'
                        break
                    case 'remove_token_from_bundle':
                    case 'remove_token_from_bundle_metadata':
                        callAction = 'remove_token_from_bundle'
                        break
                    default:
                        console.warn('action not found', trnResult.transaction.actions[0].FunctionCall.method_name)
                        callAction = null
                }
            }
        }
        router.replace({query: undefined})
        return {isSuccess, callAction, hash: tx_hash}
    }

    //  only for expose to outside vue components, for convenient invoking like AppConnector.connector.getSavedProcess()
    getSavedProcess(){
        return getSavedProcess()
    }
    //  only for expose to outside vue components, for convenient invoking like AppConnector.connector.clearSavedProcess()
    clearSavedProcess(){
        return clearSavedProcess()
    }

    //  gotErrorOnPrevAction - if user cancel one of transaction series, we need to stop next series, so if last transaction return en error in URL, prevent saved process
    async checkForSavedProcess(gotErrorOnPrevAction = null){
        // const haveErrorOrCancel = this.haveTransactionErrorURL()
        if(!gotErrorOnPrevAction){
            let saved = getSavedProcess()
            // if(saved && saved.action === 'applyEffect') await this.mintNFT(saved.tokensForBundle, saved.metaCID, saved.bundleData)
            // else if(saved && saved.action === 'makeBundle') await this.mintNFT(saved.tokensForBundle, saved.metaCID, saved.bundleData)
            // else if(saved && saved.action === 'sendToken') await this.sendNFT(saved.sendTokenData, saved.sendTo)
            if(saved && saved.action === 'sendToken') await this.sendNFT(saved.sendTokenData, saved.sendTo)
        }
    }

    // make bundle
    async mintNFT(tokensForBundle, bundleData, bundleContractAddress){
        log('mintNFT', tokensForBundle, bundleData);
        const store = AppStorage.getTokensStore()
    }

    async getBundleContracts(){
        const whiteList = await this.getWhiteList()
        return this.getFromWhiteList(whiteList, CollectionType.bundle)
    }

    async getAvailableBundleContracts(forContract = null){
        const whiteList = await this.getWhiteList()
        const checkingContract = whiteList.find(contract => stringCompare(contract.contractAddress, forContract))
        const allBundles = this.getFromWhiteList(whiteList, CollectionType.bundle)
        let returnContractsList = []
        if(checkingContract && checkingContract.onlyFor) {
            const isOnlyForExist = allBundles.find(contract => stringCompare(contract.contractAddress, checkingContract.onlyFor))
            returnContractsList = isOnlyForExist? [isOnlyForExist] : []
        }
        else returnContractsList = this.getFromWhiteList(whiteList, CollectionType.bundle)
        return returnContractsList.map(contract => ({key: contract.contractAddress, value: contract.contractAddress}))
    }

    async generateBundleMediaCover(original, modifiers, assetType = 'things') {
        const storage = AppStorage.getStore()

        const applyStyles = modifiers
            .filter(token => {
                const isFind = storage.findContractObject(token.contractAddress)
                return isFind && token.tokenRole !== TokenRoles.Original && isFind.contract.type !== CollectionType.ACHIEVEMENTS || false
            })
            .map(Token.computeModifyObject)

        const originMetadataObject = original[Symbol.for(symbolKeys.TOKEN_ORIGIN)]
        const originImage = originMetadataObject.metadata.media

        return await Token.applyAssets(
            {
                contractAddress: original.contractAddress,
                tokenID: original.id,
                contentUrl: originImage
            },
            applyStyles,
            assetType
        )
    }

    async applyAssetsToToken(original, modifiers, assetType = 'things') {
        if(!original.structure.length){
            return await this.createBundle(original, modifiers, assetType)
        }

        const baseToken = original.structure.find(token => token.tokenRole === TokenRoles.Original)
        const allModifiers = original.structure.filter(token => token.tokenRole !== TokenRoles.Original).concat(modifiers)
        const {url} = await this.generateBundleMediaCover(baseToken, allModifiers, assetType)

        const newMetadata = {
            ...original[Symbol.for(symbolKeys.TOKEN_ORIGIN)].metadata,
            media: url
        }

        const tokens = modifiers.map(token => ({
            contract: token.contractAddress,
            token_id: token.id,
            approval_id: token[Symbol.for(symbolKeys.TOKEN_ORIGIN)].approved_account_ids[original.contractAddress] || 0,
            token_role: TokenRoles.NoRole,
            owner_id: original.contractAddress
        }))

        const tokensToApprove = modifiers.map(token => token.id)

        const contract = await getBundleContractInstance(original.contractAddress)
        await contract.add_token_to_bundle_metadata(
            {
                token_to_add_data: tokens,
                tokens_to_approve: tokensToApprove,
                bundle_token_id: original.id,
                owner_id: original.contractAddress,
                metadata: newMetadata
            },
            this.attachedGas,
            this.nearGas
        )
    }

    async removeAssetsFromBundle(original, tokenForRemoving, assetType = 'things') {
        if (TokenRoles.nonRemoved.includes(tokenForRemoving.tokenRole)) throw Error(ErrorList.HAVE_SPECIAL_ROLE)

        const baseToken = original.structure.find(token => token.tokenRole === TokenRoles.Original)
        const modifiers = original.structure.filter(token => token.tokenRole !== TokenRoles.Original && !stringCompare(token.identity, tokenForRemoving.identity))
        const {url} = await this.generateBundleMediaCover(baseToken, modifiers, assetType)

        const newMetadata = {
            ...original[Symbol.for(symbolKeys.TOKEN_ORIGIN)].metadata,
            media: url
        }

        const contract = await getBundleContractInstance(original.contractAddress)
        await contract.remove_token_from_bundle_metadata(
            {
                remove_token_data: {
                    approval_id: 0,
                    contract: tokenForRemoving.contractAddress,
                    token_id: tokenForRemoving.id,
                    token_role: tokenForRemoving.tokenRole,
                    owner_id: original.contractAddress
                },
                bundle_token_id: original.id,
                metadata: newMetadata
            },
            this.attachedGas,
            '1'
        )
    }

    async mintTestToken(data){
        await this.createNewToken(data)
    }

    async createNewToken({name, premium, image, contractAddress}){
        log('createNewToken', name, premium, image, contractAddress);
        log('Create new NFT for contract', contractAddress)
        const store = AppStorage.getStore()

        const bundleImage = await computeMediaForToken(image)
        log('NFT image', bundleImage);

        const bundleData = {
            name,
            premium,
            image: bundleImage
        }
        log('bundleData', bundleData);

        store.setProcessStatus(ActionTypes.uploading_meta_data)

        const objectForMinting = {
            token_id: `token-${Date.now()}`,
            metadata: {
                title: bundleData.name,
                description: '',
                media: bundleData.image,
                link: '',
                premium: bundleData.premium
            },
            receiver_id: ConnectionStore.getUserIdentity()
        }

        saveBeforeAction('mintToken', {
            bundleData
        })

        store.setProcessStatus(ActionTypes.minting_token)
        const contract = await getContractInstance(contractAddress)
        try{
            await contract.nft_mint(objectForMinting, this.attachedGas, this.nearGas)
        }
        catch (e){
            log('nft minting error', e)
            throw Error(ErrorList.TRN_COMPLETE)
        }
    }

    // async getWrappedTokensObjectList(tokenID, contractAddress){
    async getWrappedTokensObjectList(token){
        const insideTokens = []
        for await(let tempTokenShort of token.insideTokens){
            const allTokensFromContract = await this.getAccount().then(account => {
                // account.viewFunction(tempTokenShort.contract, 'nft_tokens_for_owner', { account_id: contracts.bundle.contractName, limit: 30 })
                return account.viewFunction(tempTokenShort.contract, 'nft_tokens_for_owner', { account_id: token.contractAddress })
            })
            const findToken = allTokensFromContract.find(token => token.token_id === tempTokenShort.token_id)
            if(findToken) insideTokens.push(await this.computedTokenObject(findToken, tempTokenShort.contract, tempTokenShort.token_role))
        }
        return insideTokens
    }

    async unbundleToken({contractAddress, id}) {
        const contract = await getBundleContractInstance(contractAddress)

        try {
            contract.nft_unbundle(
                {token_id: id},
                this.attachedGas,
                '1'
            )
        } catch(e) {
            console.error('unwrap error', e)
            throw new Error(ErrorList.TRN_COMPLETE)
        }
    }



    /*
    * Make tokens bundle
    * @param {array} tokens - array of common token objects like {id (Number), address (0x...), identity, name, image, ?attributes, ?external_url}
    * @param {object} meta - {name, description, link}
    * @param {object} ?image - instance of Blob (File)
    * @return {object} like {transactionResult, provider}
    * */
    async createBundle(original, modifiers, assetType){
        log('makeTokensBundle')
        const store = AppStorage.getStore()
        store.setProcessStatus(ActionTypes.wrapping_tokens)

        const {url: generatedMediaLink} = await this.generateBundleMediaCover(original, modifiers, assetType)

        const tokensForBundleDetail = []
        const tokensForBundleShort = []

        for await (const token of [original, ...modifiers]){
            tokensForBundleDetail.push({
                approval_id: token.approved_account_ids[original.contractAddress] || 0,
                approved_account_ids: token.approved_account_ids,
                contract: token.contractAddress,
                token_id: token.id,
                token_role: stringCompare(token.identity, original.identity)? TokenRoles.Original : TokenRoles.NoRole,
                owner_id: original.contractAddress,
                metadata: {
                    ...token
                }
            })

            tokensForBundleShort.push({
                contract: token.contractAddress,
                tokens: [token.id]
            })
        }

        log('newTokensForBundle', tokensForBundleDetail)

        store.setProcessStatus(ActionTypes.minting_bundle)

        const bundleContract = await getBundleContractInstance(original.contractAddress)
        try{
            const objectForBundle = {
                tokens_for_approve: modifiers.length + 1,
                account_for_approve: original.contractAddress,
                contract_of_tokens: tokensForBundleShort,
                token_id: `token-${Date.now()}`,
                metadata: {
                    title: original.name,
                    description: original.description,
                    media: generatedMediaLink,
                    link: original.link,
                    copies: 1
                },
                bundles: tokensForBundleDetail,
                owner_id: ConnectionStore.getUserIdentity()
            }
            await bundleContract.nft_bundle_with_approve(objectForBundle, this.attachedGas, this.nearGas)
        }
        catch (e){
            log('Error nft_bundle', e);
        }
    }


    async makeAllow(token, toAddress) {
        return await this.approveTokenForOtherAccount(token, toAddress)
    }

    async approveTokenForOtherAccount({contractAddress, id}, toAddress) {
        const contractObject = await getBundleContractInstance(contractAddress)
        try{
            const objectForApprove = {
                account_id: toAddress,
                token_id: id
            }
            await contractObject.nft_approve(objectForApprove, this.attachedGas, this.nearGas)
        }
        catch (e){
            log('approve error', e);
            throw new Error(ErrorList.TRN_COMPLETE)
        }
    }

    async sendNFT(tokenObject, toAddress) {
        const store = AppStorage.getStore()
        store.setProcessStatus(ActionTypes.check_address)

        if(stringCompare(toAddress, ConnectionStore.getUserIdentity())) throw new Error(ErrorList.THE_SAME_ADDRESS)
        const [tokenID] = tokenObject.identity.split(':')

        store.setProcessStatus(ActionTypes.sending_token)

        saveBeforeAction(
            'sendToken',
            {
                sendTokenData: {
                    id: tokenObject.id,
                    identity: tokenObject.identity,
                    name: tokenObject.name,
                    image: tokenObject.image
                },
                sendTo: toAddress
            }
        )

        const contractObject = await getBundleContractInstance(tokenObject.contractAddress)
        // if(toAddress in token.approved_account_ids){
            log('token approved')
            try{
                const transferObject = {
                    receiver_id: toAddress,
                    token_id: tokenID,
                    approval_id: tokenObject[Symbol.for(SymbolKeys.TOKEN_ORIGIN)].approved_account_ids[toAddress] || 0,
                    memo: '',
                }
                contractObject.nft_transfer(transferObject, this.attachedGas, "1")
            }
            catch (e){
                log(e);
                console.log(e);
                throw new Error(ErrorList.TRN_COMPLETE)
            }
        // }
        // else{
        //     log('token not approve')
        //     try{
        //         const objectForApprove = {
        //             account_id: toAddress,
        //             token_id: tokenID
        //         }
        //         await contractObject.nft_approve(objectForApprove, this.attachedGas, this.nearGas)
        //     }
        //     catch (e){
        //         log('approve error', e);
        //         throw new Error(ErrorList.TRN_COMPLETE)
        //     }
        // }
    }

    async addToBundle(addToTokenIdentity, tokenForAddList = []){
        const [contractAddress, addToTokenID] = addToTokenIdentity.split(':')
        if(!tokenForAddList.length) throw Error()

        const tokensToApprove = tokenForAddList.map(token => token.id)

        const tokens = tokenForAddList.map(token => ({
            contract: token.identity.split(':').shift(),
            token_id: token.id,
            approval_id: token.approved_account_ids[contractAddress] || 0,
            token_role: TokenRoles.NoRole,
        }))

        const contract = await getBundleContractInstance(contractAddress)

        await contract.add_token_to_bundle(
            {
                token_to_add_data: tokens,
                tokens_to_approve: tokensToApprove,
                bundle_token_id: addToTokenID,
            },
            this.attachedGas,
            this.nearGas
        )
    }

    async removeFromBundle(fromToken, tokenForRemoving){
        const [contractAddress, bundleID] = fromToken.identity.split(':')
        const contract = await getBundleContractInstance(contractAddress)
        await contract.remove_token_from_bundle(
            {
                remove_token_data: {
                    approval_id: 0,
                    contract: tokenForRemoving.identity.split(':').shift(),
                    token_id: tokenForRemoving.id,
                    token_role: tokenForRemoving.tokenRole
                },
                bundle_token_id: bundleID,
            },
            this.attachedGas,
            '1'
        )
    }






    whiteList = []
    async getWhiteList({withUpdate = false, withMetaData = false} = {}){
        const storage = AppStorage.getStore()

        if(!storage.whiteList.length || withUpdate) {
            try{
                storage.changeWhiteListLoadingState(true)
                const contract = await getWhiteListContractInstance()
                const list = await contract.get_effects_list()
                const whiteList = list.map(contract => {
                    return {
                        type: contract.collection_type,
                        contractAddress: contract.original_contract,
                        onlyFor: contract.modificators_contract,
                        owner: contract.owner_id,
                        serverUrl: contract.server_url,
                        meta: {
                            name: contract.original_contract,
                            symbol: '',
                            totalSupply: ''
                        }
                    }
                })
                storage.setWhiteList(whiteList)
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

    async removeContractFromWhiteList(address){
        const contract = await getWhiteListContractInstance()
        await contract.remove_effect_contract_from_list(
            {effect_info_address: address},
            this.attachedGas,
            this.nearGas
        )
    }

    async addContractToWhiteList({type, contractAddress, serverUrl, owner, onlyFor}){
        const contract = await getWhiteListContractInstance()

        await contract.add_effect_contract_to_list(
            {
                effect_data: {
                    server_url: serverUrl,
                    owner_id: owner,
                    original_contract: contractAddress,
                    modificators_contract: onlyFor || null,
                    collection_type: CollectionType.getTypeByEnumNumber(type)
                }
            },
            this.attachedGas,
            this.nearGas
        )
    }

    getFromWhiteList(list, type){
        return list.filter(contract => contract.type === type)
    }

    async _filterWhiteList(list, contractType, originatedFor = null){
        const filteredList = list.filter(contract => contract.type === contractType && ((originatedFor && stringCompare(contract.onlyFor, originatedFor)) || !originatedFor));
        const contracts = []
        for await (const contractPlain of filteredList){
            const contract = await this.getContractWithTokens(contractPlain.contractAddress, contractType)
            contracts.push(contract)
        }
        return contracts
    }

    // just for compatibility with other connectors
    async getEffectContractList(config = {}){
        return this.getWhiteList(config)
    }
}

export default NearConnector