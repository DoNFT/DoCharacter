const beforeActionStoreKey = 'near-save-before-action'

/*
* For effect applying example: {action: 'applyEffect', tokensForBundle, metaCID, bundleData}
* */
export function saveBeforeAction(action, data){
    const save = {action, ...data}
    try{
        localStorage.setItem(beforeActionStoreKey, JSON.stringify(save))
        console.log('saveBeforeAction', save)
    }
    catch (e){
        console.log('saveBeforeAction error', e);
    }
}

export function getSavedProcess(){
    let result = null
    let saved = localStorage.getItem(beforeActionStoreKey)
    if(saved){
        try{
            saved = JSON.parse(saved)
            if(saved && saved.action) result = saved
        }
        catch (e){
            console.log('checkForSavedProcess error', e);
        }
    }
    return result
}

export function clearSavedProcess(){
    localStorage.removeItem(beforeActionStoreKey)
}