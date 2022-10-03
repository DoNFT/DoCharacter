import * as API from "near-api-js";
import contracts from "@/crypto/near/contracts";

// for connect to Near
const configs = {
    testnet: {
        networkId: 'testnet',
        keyStore: null,
        nodeUrl: 'https://rpc.testnet.near.org',
        walletUrl: 'https://wallet.testnet.near.org',
        helperUrl: 'https://testnet-api.kitwallet.app',
        explorerUrl: 'https://explorer.testnet.near.org',
    },
    mainnet: {
        networkId: 'mainnet',
        keyStore: null,
        nodeUrl: 'https://rpc.mainnet.near.org',
        walletUrl: 'https://wallet.near.org',
        helperUrl: 'https://helper.mainnet.near.org',
        explorerUrl: 'https://explorer.mainnet.near.org',
    }
}

export function getConfigs(networkName = process.env.VUE_APP_NETWORK){
    if(!configs[networkName]) throw Error('CONFIGS_NOT_PROVIDED')
    configs[networkName].keyStore = new API.keyStores.BrowserLocalStorageKeyStore()
    return configs[networkName]
}

export function getTokensRetrieveURL(networkName = process.env.VUE_APP_NETWORK){
    if(!configs[networkName]) throw Error('CONFIGS_NOT_PROVIDED')
    return configs[networkName].helperUrl
}

// for connect to wallet
const walletConfigs = {
    testnet: {
        contract: contracts.character.contractName,
        title: 'do[NFT] app'
    },
    mainnet: {
        contract: contracts.character.contractName,
        title: 'do[NFT] app'
    }
}
export function getConfigsForWalletConnect(networkName = process.env.VUE_APP_NETWORK){
    if(!walletConfigs[networkName]) throw Error('CONFIGS_NOT_PROVIDED')
    return walletConfigs[networkName]
}