import HTTP from "@/utils/API";
import {ErrorList} from "@/crypto/helpers";

export const acceptedTypes = ['image/png', 'image/jpeg', 'image/gif', 'text/csv']
export const acceptedImagesTypes = ['image/png', 'image/jpeg', 'image/gif']
const maxSize = 5

export function checkFile(file){
    const type = file.type.toLowerCase()

    const size = (file.size / 1024 / 1024).toFixed(2)

    if(!acceptedTypes.includes(type)) throw new Error('TYPE')
    if(size > maxSize) throw new Error('SIZE')

    return true
}

export async function checkImageMimeTypeByURL(url){
    const {data: mimetype} = await HTTP.get(
        '/ipfs/check_mimetype',
        {
            params: {url}
        }
    )

    if(!acceptedImagesTypes.includes(mimetype)) throw new Error(ErrorList.MEDIA_TYPE_NOT_SUPPORTED)

    return true
}