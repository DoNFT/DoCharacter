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

            log('User connected', accountId)
            router.replace({query: undefined})
            this.fetchUserTokens()
        }
        else log('User not connected')
        return true
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

    async fetchUserTokens(){
        const store = AppStorage.getStore()
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

            return tokens.map(token => {
                return Formatters.tokenFormat({
                    id: token.token_id,
                    contractAddress,
                    name: token.metadata.title,
                    image: token.metadata.media,
                    description: token.metadata.description,
                    specificAdditionFields: {
                        approved_account_ids: token.approved_account_ids,
                        insideTokens: token.bundles
                    }
                })
            })
        }
        catch (e) {
            log('getTokensFromContract Error', e)
            throw new Error(ErrorList.ACCOUNT_TOKENS_READING)
        }
    }

    async getContractWithTokens(contractAddress, type = null){
        console.log('getContractWithTokens', contractAddress, type);
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

    /*async getTokensFromCustomContracts(alreadyLoadedContractsNames = []){
        const customContracts = await customContractsStore.get(ConnectionStore.getNetwork().name)
        if(customContracts.length){
            try{
                log('adding custom contracts', customContracts)
                let filtered = customContracts.filter(name => !alreadyLoadedContractsNames.includes(name))
                const computedCustomContracts = await this.getTokensFromContract(filtered)
                log('receiving custom contracts', computedCustomContracts)
                return computedCustomContracts
            }
            catch (e) {
                log('getTokensFromCustomContracts', e);
                store.changeContactsLoading(false)
                throw e
            }
        }
        return []
    }*/

    /*async getTokensFromContract(contracts = []){
        return await this.getContractWithTokensList(contracts)
    }*/

    // async getTokenByIdentity(identity, tokenType = 'user'){
    async getTokenByIdentity(identity){
        log('Get token by identity', identity)
        const [contractAddress, tokenID] = identity.split(':')
        if(contractAddress && tokenID){
            // let contractsList = []
            // if(tokenType === 'user') contractsList = await this.getUserTokens();
            // else if(tokenType === 'effect') contractsList = await this.getUserEffects();
            const contractsList = await this.getUserTokens();
            const contract = contractsList.find(c => c.address === contractAddress)
            if(contract) return contract.tokens.find(t => t.id === tokenID)
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






    // async applyEffectToToken({token, effect, meta}, bundleContractAddress){
    //     const store = AppStorage.getTokensStore()
    //
    //     store.setProcessStatus(ActionTypes.generating_media)
    //     const { bundleData } = await applyEffect(token, effect, meta)
    //     log('bundleData', bundleData);
    //
    //     store.setProcessStatus(ActionTypes.uploading_meta_data)
    //
    //     const tokensForBundle = [
    //         {
    //             identity: token.identity,
    //             role: TokenRoles.Original
    //         },
    //         {
    //             identity: effect.identity,
    //             role: TokenRoles.Modifier
    //         }
    //     ]
    //     log('tokensForBundle', tokensForBundle);
    //
    //     saveBeforeAction('applyEffect', {
    //         tokensForBundle,
    //         bundleData
    //     })
    //
    //     await this.mintNFT(tokensForBundle, bundleData, bundleContractAddress)
    // }

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
                        callAction = 'add_token_to_bundle'
                        break
                    case 'remove_token_from_bundle':
                        callAction = 'remove_token_from_bundle'
                        break
                    default:
                        console.warn('action not found', trnResult.transaction.actions[0].FunctionCall.method_name)
                        callAction = null
                }
            }
        }
        log('result', isSuccess, callAction)
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

        const tokensForBundleDetail = []
        const tokensForBundleShort = []

        for await (const tokenShort of tokensForBundle){
            const [contractName, tokenID] = tokenShort.identity.split(':')
            const token = await this.getTokenByIdentity(tokenShort.identity)

            tokensForBundleDetail.push({
                approval_id: token.approved_account_ids[bundleContractAddress] || 0,
                approved_account_ids: token.approved_account_ids,
                contract: contractName,
                token_id: tokenID,
                token_role: tokenShort.role,
                metadata: {
                    ...token
                }
            })

            tokensForBundleShort.push({
                contract: contractName,
                tokens: [tokenID]
            })
        }

        log('newTokensForBundle', tokensForBundleDetail)

        store.setProcessStatus(ActionTypes.minting_bundle)

        const bundleContract = await getBundleContractInstance(bundleContractAddress)
        try{
            const objectForBundle = {
                tokens_for_approve: tokensForBundle.length,
                account_for_approve: bundleContractAddress,
                contract_of_tokens: tokensForBundleShort,
                token_id: `token-${Date.now()}`,
                metadata: {
                    title: bundleData.name,
                    description: bundleData.description,
                    media: bundleData.image,
                    link: bundleData.link,
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


    async applyAssetsToToken(original, modifiers, assetType = 'things') {
        console.log('applyAssetsToToken', assetType, original);
        console.log(modifiers);
        const storage = AppStorage.getStore()

        const allInsideTokens = original.structure
            .map(Token.computeModifyObject)
            .concat(modifiers.map(Token.computeModifyObject))

        const resultModifiersForImage = allInsideTokens
            .filter(token => {
                const isFind = storage.findContractObject(token.contractAddress)
                return isFind && token.tokenRole !== TokenRoles.Original && isFind.contract.type !== CollectionType.ACHIEVEMENTS || false
            })

        const originImage = original.originImage || original.image

        let {url, blob, cid} = await Token.applyAssets(
            {
                contractAddress: original.contractAddress,
                tokenID: original.id,
                contentUrl: originImage
            },
            resultModifiersForImage,
            assetType
        )

        const metaCID = await DecentralizedStorage.loadJSON({
            name: original.name,
            description: original.description,
            link: original.link,
            image: url,
            originImage
        })

        const computedTokenList = Token.addTokenRole(Token.transformIdentitiesToObjects(modifiers.map(t => t.identity)))

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
        // const contract = await this.getCustomContract(contractAddress)
        try{
            await contract.nft_mint(objectForMinting, this.attachedGas, this.nearGas)
        }
        catch (e){
            log('nft minting error', e)
            throw Error(ErrorList.TRN_COMPLETE)
        }
    }

    async getWrappedTokensObjectList(tokenID, contractAddress){
        const token = await this.getTokenByIdentity(`${contractAddress}:${tokenID}`)
        const insideTokens = []
        for await(let tempTokenShort of token.insideTokens){
            const allTokensFromContract = await this.getAccount().then(account => {
                // account.viewFunction(tempTokenShort.contract, 'nft_tokens_for_owner', { account_id: contracts.bundle.contractName, limit: 30 })
                return account.viewFunction(tempTokenShort.contract, 'nft_tokens_for_owner', { account_id: contractAddress })
            })
            const findToken = allTokensFromContract.find(token => token.token_id === tempTokenShort.token_id)
            if(findToken){
                insideTokens.push(Formatters.tokenFormat({
                    id: findToken.token_id,
                    contractAddress: tempTokenShort.contract,
                    name: findToken.metadata.title,
                    image: findToken.metadata.media,
                    description: findToken.metadata.description,
                    specificAdditionFields: {
                        approved_account_ids: findToken.approved_account_ids,
                        insideTokens: findToken.bundles,
                        tokenRole: tempTokenShort.token_role
                    }
                }))
            }
        }
        return insideTokens
    }

    async unwrap(tokenID, contractAddress) {
        const contract = await getBundleContractInstance(contractAddress)

        try {
            contract.nft_unbundle(
                {token_id: tokenID},
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
    // async makeTokensBundle({tokens, meta, image = null}, bundleContractAddress){
    //     log('makeTokensBundle')
    //     const store = AppStorage.getTokensStore()
    //     store.setProcessStatus(ActionTypes.wrapping_tokens)
    //     const tokensForBundle = tokens.map(token => ({
    //         identity: token,
    //         role: TokenRoles.NoRole
    //     }))
    //     log('tokensForBundle', tokensForBundle);
    //
    //     const bundleImage = await computeMediaForToken(image)
    //     log('bundleImage', bundleImage);
    //
    //     const bundleData = {
    //         ...meta,
    //         image: bundleImage
    //     }
    //     log('bundleData', bundleData);
    //     store.setProcessStatus(ActionTypes.uploading_meta_data)
    //
    //     saveBeforeAction('makeBundle', {
    //         tokensForBundle,
    //         bundleData
    //     })
    //
    //     await this.mintNFT(tokensForBundle, bundleData, bundleContractAddress)
    // }


    async sendNFT(tokenObject, toAddress) {
        const store = AppStorage.getTokensStore()
        store.setProcessStatus(ActionTypes.check_address)

        if(stringCompare(toAddress, ConnectionStore.getUserIdentity())) throw new Error(ErrorList.THE_SAME_ADDRESS)
        const [contractName, tokenID] = tokenObject.identity.split(':')
        const {effectsContract: effectsContractName} = Networks.getSettings(ConnectionStore.getNetwork().name)
        const token = await this.getTokenByIdentity(tokenObject.identity, (contractName === effectsContractName)? 'effect' : 'user')

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

        const contractObject = (stringCompare(contractName, contracts.bundle.contractName))? await this.getBundleContract() : await this.getCustomContract(contractName)
        if(toAddress in token.approved_account_ids){
            log('token approved')
            try{
                const transferObject = {
                    receiver_id: toAddress,
                    token_id: tokenID,
                    approval_id: token.approved_account_ids[toAddress],
                    memo: '',
                }
                contractObject.nft_transfer(transferObject, this.attachedGas, "1")
            }
            catch (e){
                log(e);
                throw new Error(ErrorList.TRN_COMPLETE)
            }
        }
        else{
            log('token not approve')
            try{
                const objectForApprove = {
                    account_id: toAddress,
                    token_id: tokenID
                }
                await contractObject.nft_approve(objectForApprove, this.attachedGas, this.nearGas)
            }
            catch (e){
                log('approve error', e);
                throw new Error(ErrorList.TRN_COMPLETE)
            }
        }
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

    async removeContractFromAllowEffectList(address){
        const contract = await getWhiteListContractInstance()
        await contract.remove_effect_contract_from_list(
            {effect_info_address: address},
            this.attachedGas,
            this.nearGas
        )
    }

    async addContractToAllowEffectList({contractType, contractAddress, serverUrl, owner, onlyFor}){
        const contract = await getWhiteListContractInstance()

        await contract.add_effect_contract_to_list(
            {
                effect_data: {
                    server_url: serverUrl,
                    owner_id: owner,
                    original_contract: contractAddress,
                    modificators_contract: onlyFor || null,
                    collection_type: contractType
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

/*import * as API from 'near-api-js'

import contracts from "@/crypto/near/contracts";
import {clearSavedProcess, getSavedProcess, saveBeforeAction} from "@/crypto/near/beforeActionStore";
import axios from "axios";
import {AppStorage, ConnectionStore, Networks} from "@/crypto/helpers";
import alert from "@/utils/alert";
import {getTokensByAccountId} from "@/crypto/near/API";

class NearConnector {

    nearGas = "100000000000000000000000"

    nearInstance = null
    walletConnection = null
    accountId = null
    account = null

    constructor(){

    }

    async disconnect(){
        this.walletConnection.signOut()
        setTimeout(() => location.reload())
    }

    async connectToWallet(){
        console.log('Login to near')
        const res = this.walletConnection.requestSignIn(contracts.character.contractName, 'do[NFT] app')
        console.log(res);
    }

    async init(){
        if(this.walletConnection) return this.accountId
        console.log('Init near')

        const connectOptions = {
            deps: {
                keyStore: new API.keyStores.BrowserLocalStorageKeyStore()
            },
            ...contracts.character
        }
        const near = await API.connect(connectOptions)
        this.nearInstance = near
        const networkName = `near_${near.connection.networkId}`

        const walletConnection = new API.WalletConnection(near)
        this.walletConnection = walletConnection
        const accountId = walletConnection.getAccountId() || null
        this.accountId = accountId


        if(accountId){
            console.log('User connected', accountId)
            ConnectionStore.setConnection({
                network: {
                    name: networkName,
                    id: null
                },
                userIdentity: accountId,
                disconnectMethod: () => this.disconnect()
            })
            setTimeout(() => {
                window.history.replaceState({}, document.title, '/')
                this.fetchUserTokens()
            })
        }
        else {
            console.log('User not connected')
        }

        return true
    }

    nearProvider = null
    getNearProvider(){
        if(!this.nearProvider) {
            this.nearProvider = new API.providers.JsonRpcProvider(
                contracts.character.nodeUrl
            )
        }
        return this.nearProvider
    }

    cachedContractsInstance = {}
    async getContractInstance(contractName){
        if(!this.cachedContractsInstance[contractName]){
            const contractOptions = contracts[contractName]
            const connectOptions = {
                deps: {
                    keyStore: new API.keyStores.BrowserLocalStorageKeyStore()
                },
                ...contractOptions
            }
            const near = await API.connect(connectOptions)
            const wallet = new API.WalletConnection(near)

            this.cachedContractsInstance[contractName] = await new API.Contract(
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
        return this.cachedContractsInstance[contractName]
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


    async isUserConnected(){
        const identity = this.getUserIdentity()
        if(!identity) throw new Error('USER_NOT_CONNECTED')
        return identity
    }



    async fetchUserTokens() {
        const storage = AppStorage.getStore()
        storage.changeCollectionLoadingState(true)
        const resultContracts = new Set()

        let userContracts = []
        const accountID = ConnectionStore.getUserIdentity()
        try{
            userContracts = await getTokensByAccountId(accountID)
        }
        catch (e) {
            storage.changeCollectionLoadingState(false)
            throw new Error('NETWORK_ERROR')
        }

        // compute default contracts (bundle, effect, test)
        const defaultContracts = []

        const whiteList = await this.getWhiteList({withUpdate: true})
        const bundleContracts = this.getFromWhiteList(whiteList, contractTypeList.bundle)
        const styleContracts = this.getFromWhiteList(whiteList, contractTypeList.style)
        const tokenContracts = this.getFromWhiteList(whiteList, contractTypeList.other)

        if(bundleContracts.length) defaultContracts.push(...bundleContracts.map(contract => contract.contractAddress))
        if(styleContracts.length) defaultContracts.push(...styleContracts.map(contract => contract.contractAddress))
        if(tokenContracts.length) defaultContracts.push(...tokenContracts.map(contract => contract.contractAddress))
    }

    async createNFT(image, effectObject){
      const originImage = await this.putFileToIpfs(image)
      let applyEffectResponse = null
      try{
        applyEffectResponse = await axios.post(process.env.VUE_APP_API_ENDPOINT + '/effects/applyEffect', {
            contentUrl: originImage,
            actor_name: effectObject.id + '',
            // original: {
            //   contract: '0x00',
            //   tokenId: '0',
            //   contentUrl: originImage
            // },
            // modificator: {
            //   contract: '0x00',
            //   tokenId: '0',
            //   contentUrl: effectObject.image
            // },
            // sender: this.getUserIdentity()
          },
          {
            responseType: 'blob'
          })
      }
      catch (e){
        console.log(e);
        throw new Error('API')
      }
      if(applyEffectResponse && applyEffectResponse.data){

        const objectForMinting = {
          token_id: `NFT-${Date.now()}`,
          metadata: {
            title: `do1inchship`,
            description: 'Especially for @1inch and @ShipyardSW NYC party from @DoNFTio',
            media: applyEffectResponse.headers.contenturl.replace('ipfs://', 'https://ipfs.io/ipfs/'),
            link: process.env.VUE_APP_COLLECTION_URL
          },
          receiver_id: this.getUserIdentity()
        }

        saveBeforeAction('mintSelfie', objectForMinting)
        localStorage.setItem('near-process-minted-result', JSON.stringify(objectForMinting))

        const contract = await this.getContractInstance(contracts.selfie.contractName)
        try{
          await contract.nft_mint(objectForMinting, "300000000000000", this.nearGas)
        }
        catch (e){
          console.log('nft minting error', e)
        }
      }
      else throw new Error('API')
    }

    async startMinting(image, effectObject){
        localStorage.setItem('near-process-selected-effect', JSON.stringify(effectObject))
        try{
            await this.makeSelfieNFT(image)
        }
        catch(e) {
            console.log('makeSelfieNFT Error', e)
            throw new Error('MAKE_SELFIE')
        }
    }

    async handleMintProcess(setScreen, setStep, stepList, setMintingResult){
      console.log('handleMintProcess')
      const tx_hash = this.haveTransactionInURL()
      if(tx_hash){
          console.log(tx_hash)
          const {isSuccess, callAction} = await this.readTransaction(tx_hash)
          if(isSuccess){
              setScreen(stepList.StepFour)

              // /-*if(callAction === 'mint'){
              //     const savedAction = this.getSavedProcess()
              //     if(savedAction){
              //         if(savedAction.action === 'mintSelfie'){
              //             setStep('2/5 Minting style')
              //             await this.duplicateEffect();
              //         }
              //         else if(savedAction.action === 'mintEffect'){
              //             setStep('3/5 Approve selfie')
              //             await this.approveSelfie();
              //         }
              //     }
              // }
              // else if(callAction === 'approve'){
              //     const savedAction = this.getSavedProcess()
              //     if(savedAction.action === 'approveSelfie'){
              //         setStep('4/5 Approve effect')
              //         await this.approveEffect();
              //     }
              //     else if(savedAction.action === 'approveEffect'){
              //         setStep('5/5 Generating new NFT')
              //         await this.applyEffectToToken();
              //     }
              // }
              else *-/
              // if(callAction === 'bundle'){
              if(callAction === 'mint'){
                  const {image, explorer, tokenID, marketplaceExplorer} = this.getMintedBundle()
                  console.log(this.getNetworkName());
                  const savedAction = this.getSavedProcess()
                  console.log(savedAction);
                  const market = marketplaceExplorer(contracts.selfie.contractName, savedAction.token_id)
                  setMintingResult(image, explorer + tx_hash, tokenID, market)
                  setScreen(stepList.StepFive, stepList.StepSix)
                  // this.clearSavedSteps()
              }
          }
      }

      const tx_error = this.haveTransactionErrorURL()
      if(tx_error){
          console.log('tx_error', tx_error);
          alert.open(tx_error.message)
      }
    }

    async makeSelfieNFT(image){
        console.log('makeSelfieNFT', image)

        let bundleImage = null
        if(image instanceof Blob) {
            bundleImage = await this.putFileToIpfs(image)
        }
        else throw Error('MAKE_SELFIE')
        console.log('NFT image', bundleImage);

        const objectForMinting = {
            token_id: `selfie-${Date.now()}`,
            metadata: {
                title: `Selfie-${Date.now()}`,
                description: '',
                media: bundleImage,
                link: '',
            },
            receiver_id: this.getUserIdentity()
        }

        saveBeforeAction('mintSelfie', objectForMinting)
        localStorage.setItem('near-process-minted-selfie', JSON.stringify(objectForMinting))

        const contract = await this.getContractInstance(contracts.selfie.contractName)
        try{
            await contract.nft_mint(objectForMinting, "300000000000000", this.nearGas)
        }
        catch (e){
            console.log('nft minting error', e)
        }
    }

    async duplicateEffect(){
        console.log('duplicateEffect')
        const effectObject = JSON.parse(localStorage.getItem('near-process-selected-effect') || '{}')
        console.log(effectObject);

        let effectImageBlob = null
        if(typeof effectObject.image === 'string'){
            try{
                effectImageBlob = await fetch(effectObject.image).then(r => r.blob())
            }
            catch(e) {
                console.log('Load effect img error', e)
                throw Error('EFFECT_LOAD_ERROR')
            }
        }
        console.log('effectImageBlob', effectImageBlob);
        let bundleImage = null
        if(effectImageBlob instanceof Blob) {
            bundleImage = await this.putFileToIpfs(effectImageBlob)
        }
        console.log('NFT image', bundleImage);
        if(!bundleImage) throw Error('MAKE_EFFECT')

        const objectForMinting = {
            token_id: `effect-${Date.now()}`,
            metadata: {
                title: `Effect-${Date.now()}`,
                description: '',
                media: bundleImage,
                link: '',
            },
            receiver_id: this.getUserIdentity()
        }

        saveBeforeAction('mintEffect', objectForMinting)
        localStorage.setItem('near-process-minted-effect', JSON.stringify(objectForMinting))

        const contract = await this.getContractInstance(contracts.effects.contractName)
        try{
            await contract.nft_mint(objectForMinting, "300000000000000", this.nearGas)
        }
        catch (e){
            console.log('nft minting error', e)
        }
    }

    async approveSelfie(){
        let contractObject = await this.getContractInstance(contracts.selfie.contractName)
        const selfieObject = JSON.parse(localStorage.getItem('near-process-minted-selfie') || '{}')
        try{
            const objectForApprove = {
                account_id: contracts.bundle.contractName,  //  bundle contract name
                token_id: selfieObject.token_id,            //  token ID
            }
            saveBeforeAction('approveSelfie', objectForApprove)
            await contractObject.nft_approve(objectForApprove, "300000000000000", this.nearGas)
        }
        catch (e){
            console.log('approve error', e);
        }
    }

    async approveEffect(){
        let contractObject = await this.getContractInstance(contracts.effects.contractName)
        const selfieObject = JSON.parse(localStorage.getItem('near-process-minted-effect') || '{}')
        try{
            const objectForApprove = {
                account_id: contracts.bundle.contractName,  //  bundle contract name
                token_id: selfieObject.token_id,            //  token ID
            }
            saveBeforeAction('approveEffect', objectForApprove)
            await contractObject.nft_approve(objectForApprove, "300000000000000", this.nearGas)
        }
        catch (e){
            console.log('approve error', e);
        }
    }

    async applyEffectToToken(){
        const token = JSON.parse(localStorage.getItem('near-process-minted-selfie') || '{}')
        const effect = JSON.parse(localStorage.getItem('near-process-minted-effect') || '{}')
        console.log('applyEffectToToken', token, effect)

        if(!token.metadata.media || !effect.metadata.media) throw new Error('IMG_NOT_EXIST')

        const tokensInBundleDetails = {
            original: {
                contract: contracts.selfie.contractName,
                tokenId: token.token_id,
                contentUrl: token.metadata.media
            },
            modificator: {
                contract: contracts.effects.contractName,
                tokenId: effect.token_id,
                contentUrl: effect.metadata.media
            }
        }
        console.log('tokensInBundleDetails', tokensInBundleDetails);

        let bundleImageStoredURL = null
        try{
            const {headers} = await axios.post(
                process.env.VUE_APP_API_ENDPOINT + `/effects/applyEffect`,
                {
                    ...tokensInBundleDetails,
                    sender: this.getUserIdentity()
                })
            if(typeof headers.contenturl === 'string') bundleImageStoredURL = `https://ipfs.io/${headers.contenturl.replace(':/', '')}`
            else throw new Error()
            // if(typeof result.data === 'string') bundleImage = `https://ipfs.io/${result.data.replace(':/', '')}`
            // else throw new Error()
        }
        catch (e){
            console.log('error', e);
            throw new Error('APPLY_ERROR')
        }
        console.log('bundleImage', bundleImageStoredURL);

        const newTokensForBundle = []
        newTokensForBundle.push({
            approval_id: 0,
            approved_account_ids: {[contracts.bundle.contractName]: 0},
            contract: contracts.selfie.contractName,
            token_id: token.token_id,
            metadata: {
                address: token.token_id,
                approved_account_ids: {[contracts.bundle.contractName]: 0},
                attributes: {},
                description: '',
                id: token.token_id,
                identity: `${contracts.selfie.contractName}:${token.token_id}`,
                insideTokens: [],
                image: token.metadata.media,
                link: '',
                name: token.metadata.title,
            }
        })
        newTokensForBundle.push({
            approval_id: 0,
            approved_account_ids: {[contracts.bundle.contractName]: 0},
            contract: contracts.effects.contractName,
            token_id: effect.token_id,
            metadata: {
                address: effect.token_id,
                approved_account_ids: {[contracts.bundle.contractName]: 0},
                attributes: {},
                description: '',
                id: effect.token_id,
                identity: `${contracts.effects.contractName}:${effect.token_id}`,
                insideTokens: [],
                image: effect.metadata.media,
                link: '',
                name: effect.metadata.title,
            }
        })

        const objectForBundle = {
            bundles: newTokensForBundle,
            metadata: {
                title: `Token-${Date.now()}`,
                description: '',
                media: bundleImageStoredURL,
                link: '',
                copies: 1
            },
            token_id: `token-${Date.now()}`,
        }
        console.log('bundleData', objectForBundle);
        localStorage.setItem('near-process-minted-result', JSON.stringify(objectForBundle))

        const bundleContract = await this.getBundleContract()
        await bundleContract.nft_bundle(objectForBundle, "300000000000000", this.nearGas)
    }

    getMintedBundle(){
        const resultToken = JSON.parse(localStorage.getItem('near-process-minted-result') || '{}')
        console.log('resultToken', resultToken)
        const {transactionExplorer, marketplaceExplorer} = Networks.getData(ConnectionStore.getNetwork().name)
        return {
            explorer: transactionExplorer,
            image: resultToken.metadata.media,
            marketplaceExplorer,
            tokenID: resultToken.token_id
        }
    }

    haveTransactionInURL(){
        const url = new URL(document.location)
        const hash = url.searchParams.get('transactionHashes')
        window.history.replaceState({}, document.title, '/');
        return hash
    }
    haveTransactionErrorURL(){
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
            return errorObject
        }
        else return undefined
    }
    async readTransaction(tx_hash){
        console.log('readTransaction', tx_hash);
        let isSuccess = false
        let callAction = null
        let trnResult = await this.getNearProvider().txStatus(tx_hash, this.getUserIdentity())
        console.log('trnResult', trnResult);

        if(trnResult && 'SuccessValue' in trnResult.status){
            isSuccess = true
            if(trnResult.transaction.actions[0] && trnResult.transaction.actions[0].FunctionCall){
                switch(trnResult.transaction.actions[0].FunctionCall.method_name) {
                    case 'nft_approve':
                        callAction = 'approve'
                        break
                    case 'nft_bundle':
                        callAction = 'bundle'
                        break
                    case 'nft_mint':
                        callAction = 'mint'
                        break
                    default:
                        callAction = null
                }
            }
        }
        console.log('result', isSuccess, callAction)
        return {isSuccess, callAction}
    }

    getSavedProcess(){
        return getSavedProcess()
    }
    clearSavedProcess(){
        return clearSavedProcess()
    }
    clearSavedSteps(){
        this.clearSavedProcess()
        localStorage.removeItem('near-process-selected-effect')
        localStorage.removeItem('near-process-minted-selfie')
        localStorage.removeItem('near-process-minted-effect')
        localStorage.removeItem('near-process-minted-result')
    }
}

export default NearConnector
*/