import {getConfig} from "@/crypto/near/networks";
import {Networks} from "@/crypto/helpers";

const cache = new Map()

export default new Proxy({}, {
    get(target, name){
        const settings = Networks.getSettings(`near_${process.env.VUE_APP_NETWORK}`)
        let contract = null
        if(name === 'character') contract = settings.characterContract;
        else if(name === 'items') contract = settings.thingContract;
        else if(name === 'colors') contract = settings.colorContract;
        else if(name === 'achievements') contract = settings.achievements;
        else if(name === 'whiteList') contract = settings.whiteListContract;
        else contract = settings.characterContract;
        return cache.get(name) || cache.set(name, getConfig({ env: process.env.VUE_APP_NETWORK, contract, originContractName: name })).get(name)
    }
})