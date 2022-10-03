// import {HTTP} from "@/utils/API";
// import {ConnectionStore} from "@/connectors/ConnectionStore";
// import getStorage from "@/utils/storage";
// import EffectContractList from "@/connectors/EffectContractList";
import {checkImageMimeTypeByURL} from "@/utils/fileChecking";
import {AppStorage, ErrorList, ActionTypes, DecentralizedStorage} from "@/crypto/helpers";
//
//
// /*
// * Apply effect to NFT and return object of bundleData {...meta, ...tokensInBundleDetails, image} and bundleImage (temp image in blob)
// * */
// export async function applyEffect(token, effect, meta){
//     if(!token.image || !effect.image) throw new Error(ErrorList.IMG_NOT_EXIST)
//
//     const modifyContractAddress = effect.identity.split(':').shift()
//     const serverURL = await EffectContractList.getServerURL(modifyContractAddress)
//
//     const tokensInBundleDetails = {
//         original: {
//             contract: token.identity.split(':').shift(),
//             tokenId: token.id,
//             contentUrl: token.image
//         },
//         modificator: {
//             contract: effect.identity.split(':').shift(),
//             tokenId: effect.id,
//             contentUrl: effect.image
//         }
//     }
//
//     let bundleImageStoredURL = null
//     let bundleImageTempURL = null
//     try{
//         const {headers, data: blobImage} = await HTTP.post(
//             serverURL,
//             {
//                 ...tokensInBundleDetails,
//                 sender: ConnectionStore.getUserIdentity()
//             },
//             {
//                 responseType: 'blob'
//             }
//         )
//         bundleImageTempURL = URL.createObjectURL(blobImage)
//         if(typeof headers.contenturl === 'string') bundleImageStoredURL = `https://ipfs.io/${headers.contenturl.replace(':/', '')}`
//         else throw new Error()
//     }
//     catch (e){
//         const errorMessage = e.response && e.response.data? (await e.response.data.text()).toLowerCase() : ''
//         if(errorMessage.includes('unknown image file format')) throw new Error(ErrorList.MEDIA_TYPE_NOT_SUPPORTED)
//         console.log('error', e);
//         throw new Error(ErrorList.APPLY_ERROR)
//     }
//     console.log('bundleImage', bundleImageStoredURL, bundleImageTempURL);
//
//     const bundleData = {
//         ...meta,
//         ...tokensInBundleDetails,
//         image: bundleImageStoredURL,
//     }
//
//     return {
//         bundleImage: bundleImageTempURL,
//         bundleData
//     }
// }
//
/*
* For create new token and make bundle (where user load image manually)
* */

export async function computeMediaForToken(image = null){
    let returnImage = null
    const store = AppStorage.getStore()

    if(typeof image === 'string'){
        // if image is already loaded to remote server, using this url
        if(image.startsWith('http') || image.startsWith('www') || image.startsWith('ipfs')){
            returnImage = image
            await checkImageMimeTypeByURL(returnImage)
        }
        else{
            store.setProcessStatus(ActionTypes.uploading_media)
            // if it is local image ex "/images/01.png", load it binary code and put it to decentralized storage
            try{
                image = await fetch(image).then(r => r.blob())
            }
            catch(e) {
                console.log('Load img error', e)
                throw new Error(ErrorList.LOAD_MEDIA_ERROR)
            }
        }
    }

    if(image instanceof Blob) {
        store.setProcessStatus(ActionTypes.uploading_media)
        returnImage = await DecentralizedStorage.loadFile(image)
    }

    console.log('NFT image', returnImage);
    return returnImage
}
//
// /*
// * Upload token metadata to ipfs
// * @return ipfs CID
// * */
// export async function computeTokenMetadata(json){
//     console.log('NFT metadata', json);
//     const dataStorage = getStorage()
//     const metaCID = await dataStorage.loadJSON(json)
//     console.
//     console.log('NFT CID', metaCID);
//     return metaCID
// }