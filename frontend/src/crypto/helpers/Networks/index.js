const networks = {
    rinkeby_testnet: {
        name: "rinkeby_testnet",
        chainId: 42,
        transactionExplorer: "https://rinkeby.etherscan.io/tx",
        accountExplorer: "https://rinkeby.etherscan.io/address/",
        marketplaceExplorer: (contractAddress, tokenID) => `https://opensea.io/assets/ethereum/${contractAddress}/${tokenID}`,
        gasLimit: 400000
    },
    maticmum: {
        name: "maticmum",
        chainId: 80001,
        transactionExplorer: "https://mumbai.polygonscan.com/tx/",
        accountExplorer: "https://mumbai.polygonscan.com/address/",
        marketplaceExplorer: (contractAddress, tokenID) => `https://testnets.opensea.io/assets/mumbai/${contractAddress}/${tokenID}`,
        gasLimit: 400000
    },
    sokol_testnet: {
        name: "sokol_testnet",
        chainId: 77,
        transactionExplorer: "https://blockscout.com/poa/sokol/tx/",
        accountExplorer: "https://blockscout.com/poa/sokol/address/",
        // @todo find right explorer
        marketplaceExplorer: (contractAddress, tokenID) => ``,
        gasLimit: 400000
    },
    cronos_testnet: {
        name: "cronos_testnet",
        chainId: 338,
        transactionExplorer: "https://cronos.crypto.org/explorer/testnet3/tx/",
        accountExplorer: "https://cronos.crypto.org/explorer/testnet3/address/",
        // @todo find right explorer
        marketplaceExplorer: (contractAddress, tokenID) => ``,
        gasLimit: 400000
    },
    neon_devnet: {
        name: "neon_devnet",
        chainId: 245022926,
        transactionExplorer: "https://neonscan.org/tx/",
        accountExplorer: "https://neonscan.org/address/",
        // @todo find right explorer
        marketplaceExplorer: (contractAddress, tokenID) => ``,
    },
    polygon_mainnet: {
        name: "polygon_mainnet",
        chainId: 137,
        transactionExplorer: "https://polygonscan.com/tx/",
        accountExplorer: "https://polygonscan.com/address/",
        marketplaceExplorer: (contractAddress, tokenID) => `https://opensea.io/assets/matic/${contractAddress}/${tokenID}`,
        gasLimit: 400000
    }
}

const settings = {
    rinkeby_testnet: {
        api: 'https://api.rarible.org/v0.1',
        blockchain: 'ETHEREUM',
        characterContract: '0x5BA28E89175CDe8bBC4E8dbCB320048425cEC2D9',
        thingContract: '0xF03Ed64EF414f9cA556191bC39a8dc4784d6294a',
        colorContract: '0x95EdbeBBaD0f283fa9AA9DAaFf80FbaE867Fd142',
        achievements: '0x58Acb66dd2aFFaF58673A3a7a3e470E811504967',

        whiteListContract: '0xF4E6b0248cDF44bdd499349EFb2f6F588a9B45Df',
    },
    maticmum: {
        api: 'https://api-staging.rarible.org/v0.1',
        store: 'https://testnets.opensea.io',
        blockchain: 'POLYGON',
        characterContract: '0x610d1f5149031185b264245d340108c15a1a01dc',
        thingContract: '0xfa44bb5e1b8c7be977cd5001008bc1caeee16e6a',
        colorContract: '0xa95107620a198d7b141b32e42ff298f935a97585',
        achievements: '0x1AF0454bcc3944B2cc94BD2D95A5E8354A0d68aa',

        whiteListContract: '0x4a74ba982b0229fdb4c9e69930ad9bb4a8bf9810',
    },
    sokol_testnet: {
        api: null,
        store: 'https://testnets.opensea.io',
        blockchain: 'ETHEREUM',
        characterContract: '0xB62C4Ac91b2cAA1D002350A69934c394d4DA2283',
        // thingContract: '0xA95107620a198d7B141B32E42FF298f935A97585',
        thingContract: '0xeaE16eB54D9A2fd0a76BBD879539C2EC038cE2d1',

        colorContract: '0x48e24d6a6bbaacf6256e7948c9e16601a4f521b8',
        achievements: '0x8c35ebf867323af8246953e99be8a4d5709a19a0',

        whiteListContract: '0x3b3c5c0e75163e89968300a077d45f69212d1beb',
    },
    cronos_testnet: {
        api: null,
        store: 'https://testnets.opensea.io',
        blockchain: 'ETHEREUM',
        characterContract: '0x55181Ea172ED9205252D559D782bA18488461303',
        // thingContract: '0xA95107620a198d7B141B32E42FF298f935A97585',
        thingContract: '0xd4B754464c4C0Ea996C468A7e2B7E41Cc9494E40',

        colorContract: '0x458d5e59BA0590AfDFE1A55226Bd751C7a87477a',
        achievements: '0x2F0689f3bCEF57BeD577310e1c4f1275BE15394a',

        whiteListContract: '0x91b3Bcb5cb609CF307cb365124753a6Fb3bcC58A',
    },
    neon_devnet: {
        api: null,
        store: 'https://testnets.opensea.io',
        blockchain: 'ETHEREUM',
        characterContract: '0x55181ea172ed9205252d559d782ba18488461303',
        // thingContract: '0xA95107620a198d7B141B32E42FF298f935A97585',
        thingContract: '0xd4B754464c4C0Ea996C468A7e2B7E41Cc9494E40',
        colorContract: '0x2F0689f3bCEF57BeD577310e1c4f1275BE15394a',
        achievements: '0x91b3Bcb5cb609CF307cb365124753a6Fb3bcC58A',

        whiteListContract: '0xdD3610C4c9638d44329c10E23c835754f36D862d',
    },
    polygon_mainnet: {
        api: 'https://api.rarible.org/v0.1',
        blockchain: 'POLYGON',
        // tokenAddress: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
        // limitOrderAddress: '0x94Bc2a1C732BcAd7343B25af48385Fe76E08734f',

        characterContract: '0xc806bbF2B77513A958f8aD55DBF1c53A4AfEA172',
        thingContract: '0x4466901121916c376C2C9DD1A56d6E0a51A18b43',
        colorContract: '0x021CbF1A5212AAD4B7AC39803A154BE624307613',
        achievements: '0x69Dc9538bBA682ACf8dc1d0D6f333AC231FfA678',

        whiteListContract: '0x949084f627840bF23CAB88252613D7553d7A774D',
    }
}

export function getNameByChainID(chainID){
    const [name] = Object.entries(networks).find(([, data]) => data.chainId === chainID) || ['unknown']
    let isSupport = (name !== 'unknown')? !!+process.env[`VUE_APP_NETWORK_${name.toUpperCase()}_SUPPORT`] : false

    return isSupport? name : 'unknown'
}

export function getData(networkName){
    return networks[networkName.toLowerCase()] || null
}

export function getSettings(networkName){
    return settings[networkName.toLowerCase()] || null
}