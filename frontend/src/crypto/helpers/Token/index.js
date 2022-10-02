import AppAPI, {HTTP} from "@/utils/API";
import ConnectionStore from "@/crypto/helpers/ConnectionStore";
import TokenRoles from "@/crypto/helpers/TokenRoles"
import {catToFixed, shortCat} from "@/utils/string";
import {DecentralizedStorage, Token} from "@/crypto/helpers";

// export async function applyAssets(original, modifiers, assetType = 'things'){
export async function applyAssets({contractAddress, tokenID, contentUrl}, modifiers, assetType = 'things'){

    // return {
    //     url: 'https://ipfs.io/ipfs/QmXsFAJgX9mVwMLFQx9xZbj4SyJijTXLJRVov5z54SJ3CE',
    //     blob: 'https://ipfs.io/ipfs/QmXsFAJgX9mVwMLFQx9xZbj4SyJijTXLJRVov5z54SJ3CE',
    //     cid: 'QmXsFAJgX9mVwMLFQx9xZbj4SyJijTXLJRVov5z54SJ3CE'
    // }

    console.log('applyAssets', arguments);
    if(!modifiers.length) {
        const cid = Token.getCIDFromURL(contentUrl)
        return {
            url: contentUrl,
            blob: contentUrl,
            cid
        }
    }
    const modificator = []
    modifiers.forEach(token => {
        modificator.push({
            "contract": token.contractAddress,
            "tokenId": token.tokenID,
            "contentUrl": token.contentUrl
        })
    })
    const sendBody = {
        original: {
            "contract": contractAddress,
            "tokenId": tokenID,
            "contentUrl": contentUrl
        },
        modificator,
        "sender": ConnectionStore.getUserIdentity(),
        return_type: 'storage'
        // return_type: 'file'
    }

    const endpoint = (assetType === 'things')? '/effects/applyEffect' : '/effects/changeColor'
    const {headers, data: blobImage} = await AppAPI.post(
        endpoint,
        sendBody,
        {
            responseType: 'blob'
        }
    )

    if(assetType === 'things') {
        // because applyEffect does not save to IPFS anymore
        const url = await DecentralizedStorage.loadFile(blobImage)
        return {
            url,
            blob: URL.createObjectURL(blobImage),
            cid: headers.contenturl.split('://')[1]
        }
    }

    return {
        url: `https://ipfs.io/${headers.contenturl.replace(':/', '')}`,
        blob: URL.createObjectURL(blobImage),
        cid: headers.contenturl.split('://')[1]
    }
}

export async function addNumberToToken({contractAddress, tokenID, contentURI}, number){
    console.log('addNumberToToken', arguments);
    const sendBody = {
        original: {
            "contract": contractAddress,
            "tokenId": tokenID,
            "contentUrl": contentURI
        },
        number,
        "sender": ConnectionStore.getUserIdentity()
    }
    const endpoint = '/effects/addNumber'
    const {headers, data: blobImage} = await AppAPI.post(
        endpoint,
        sendBody,
        {
            responseType: 'blob'
        }
    )

    return {
        url: `https://ipfs.io/${headers.contenturl.replace(':/', '')}`,
        blob: URL.createObjectURL(blobImage),
        cid: headers.contenturl.split('://')[1]
    }
}

export function transformIdentityToObject(identity){
    const [token, tokenId] = identity.split(':')
    return {token, tokenId}
}

export function transformIdentitiesToObjects(identitiesList){
    return identitiesList.map(transformIdentityToObject)
}

export function addTokenRole(identityObjectList, {originalIdentities = [], modifierIdentities = []} = {}){
    return identityObjectList.map(token => {
        const tokenIdentity = `${token.token}:${token.tokenId}`
        const role = originalIdentities.includes(tokenIdentity) && TokenRoles.Original || modifierIdentities.includes(tokenIdentity) && TokenRoles.Modifier || TokenRoles.NoRole
        return {
            ...token,
            role
        }
    })
}

/*
* @param contract:Object
* @return string: '<contractName>:<contractAddress>'
* */
export function getContractShortDefinition(contract){
    return `${shortCat(contract.name)}:${catToFixed(contract.address)}`
}

/*
* @param token:Object
* @return string: '<tokenName>:<tokenID>'
* */
export function getTokenShortDefinition(token){
    const tokenID = (token.id.length > 4)? catToFixed(token.id) : token.id
    return `${shortCat(token.name)}:${tokenID}`
}

export function generateJsonForTokenList(tokens){
    const r = {}
    tokens.forEach(token => {
        r[getTokenShortDefinition(token)] = generateJsonForTokenList(token.structure)
    })
    return r
}

export function generateJsonViewForContractList(list){
    const r = {}
    list.forEach(contract => {
        r[getContractShortDefinition(contract)] = generateJsonForTokenList(contract.tokens)
    })
    return r
}

export function getTokenFieldsInJson(fieldsArray){
    const r = {}
    fieldsArray.forEach(prop => {
        r[prop.key] = prop.value
    })
    return r
}

export function getCIDFromURL(url){
    const cid = (url.split('/ipfs/').length > 1)? url.split('/ipfs/')[1] : url
    return cid
}

export function computeModifyObject(token){
    return {
        contractAddress: token.contractAddress,
        tokenID: token.id,
        contentUrl: token.image,
        tokenRole: token.tokenRole || TokenRoles.NoRole
    }
}