const networks = {
    sepolia: {
        meta: {
            title: 'Sepolia',
            image: 'polygon',
            chainId: 11155111,
            transactionExplorer: "https://sepolia.etherscan.io/tx/",
            accountExplorer: "https://sepolia.etherscan.io/address/",
            marketplaceExplorer: (contractAddress, tokenID) => `https://testnets.opensea.io/assets/mumbai/${contractAddress}/${tokenID}`,
            gasLimit: 400000
        },
        contracts: {
            // all contracts (like character, thing, color, achievements) stored in whiteListContract so it is not necessary to store them here
            whiteListContract: '0x559acfdb7a30fb6ecf5883c1f25b9eb2a34cf37a',
            adminAddress: '0xD25A41039DEfD7c7F0fBF6Db3D1Df60b232c6067',
        }
    },
    maticmum: {
        meta: {
            title: 'Mumbai testnet',
            image: 'polygon',
            chainId: 80001,
            transactionExplorer: "https://mumbai.polygonscan.com/tx/",
            accountExplorer: "https://mumbai.polygonscan.com/address/",
            marketplaceExplorer: (contractAddress, tokenID) => `https://testnets.opensea.io/assets/mumbai/${contractAddress}/${tokenID}`,
            gasLimit: 400000
        },
        contracts: {
            whiteListContract: '0x6fc2aa966015164624c888d9f7ec407c59353ca7',
            adminAddress: '0xD25A41039DEfD7c7F0fBF6Db3D1Df60b232c6067',
        }
    },
    polygon_mainnet: {
        meta: {
            title: 'Polygon mainnet',
            image: 'polygon',
            chainId: 137,
            transactionExplorer: "https://polygonscan.com/tx/",
            accountExplorer: "https://polygonscan.com/address/",
            marketplaceExplorer: (contractAddress, tokenID) => `https://opensea.io/assets/matic/${contractAddress}/${tokenID}`,
            gasLimit: 400000
        },
        contracts: {
            whiteListContract: '0x949084f627840bF23CAB88252613D7553d7A774D',
            adminAddress: '0xD25A41039DEfD7c7F0fBF6Db3D1Df60b232c6067',
        }
    },
    metis_testnet: {
        meta: {
            title: 'Metis testnet',
            image: 'metis',
            chainId: 588,
            transactionExplorer: "https://stardust-explorer.metis.io/tx/",
            accountExplorer: "https://stardust-explorer.metis.io/address/",
            marketplaceExplorer: (contractAddress, tokenID) => ``,
            gasLimit: 400000
        },
        contracts: {
            whiteListContract: '0xf7b2ab410dc4ba7f1beb29d7d4500d6d6bc44570',
            adminAddress: '0xD25A41039DEfD7c7F0fBF6Db3D1Df60b232c6067',
        }
    },
    sokol_testnet: {
        meta: {
            title: 'Gnosis/sokol',
            image: 'gnosis',
            chainId: 77,
            transactionExplorer: "https://blockscout.com/poa/sokol/tx/",
            accountExplorer: "https://blockscout.com/poa/sokol/address/",
            // @todo find right explorer
            marketplaceExplorer: (contractAddress, tokenID) => ``,
            gasLimit: 400000
        },
        contracts: {
            whiteListContract: '0x9b992210d6a9b907e2db4307a924a5ec5f09c9ba',
            adminAddress: '0xD25A41039DEfD7c7F0fBF6Db3D1Df60b232c6067',
        }
    },
    cronos_testnet: {
        meta: {
            title: 'Cronos testnet',
            image: 'cronos',
            chainId: 338,
            transactionExplorer: "https://cronos.crypto.org/explorer/testnet3/tx/",
            accountExplorer: "https://cronos.crypto.org/explorer/testnet3/address/",
            // @todo find right explorer
            marketplaceExplorer: (contractAddress, tokenID) => ``,
            gasLimit: 400000
        },
        contracts: {
            whiteListContract: '0xdaefb30a240251deaf13afafaad6b83980cfd783',
            adminAddress: '0xD25A41039DEfD7c7F0fBF6Db3D1Df60b232c6067',
        }
    },
    neon_devnet: {
        meta: {
            title: 'Neon devnet',
            image: 'neon',
            chainId: 245022926,
            transactionExplorer: "https://neonscan.org/tx/",
            accountExplorer: "https://neonscan.org/address/",
            // @todo find right explorer
            marketplaceExplorer: (contractAddress, tokenID) => ``,
        },
        contracts: {
            whiteListContract: '0x70cb8b66725b0a2356abd882fe73940a3835608e',
            adminAddress: '0xD25A41039DEfD7c7F0fBF6Db3D1Df60b232c6067',
        }
    },
    skale: {
        meta: {
            title: 'Skale stocky pleione',
            image: 'skale',
            chainId: 1250011826715177,
            transactionExplorer: "https://stocky-pleione.explorer.staging-v2.skalenodes.com/tx/",
            accountExplorer: "https://stocky-pleione.explorer.staging-v2.skalenodes.com/address/",
            // @todo find right explorer
            marketplaceExplorer: (contractAddress, tokenID) => ``,
            gasLimit: 400000
        },
        contracts: {
            whiteListContract: '0xe8ef4c01c078452221b902226aecea6664a1f554',
            adminAddress: '0x7bBc0e7a47857Bf0154FbAccBcbdd3079280955E',
        }
    },
    bsc_testnet: {
        meta: {
            title: 'BSC testnet',
            image: 'bsc',
            chainId: 97,
            transactionExplorer: "https://testnet.bscscan.com/tx/",
            accountExplorer: "https://testnet.bscscan.com/address/",
            // @todo find right explorer
            marketplaceExplorer: (contractAddress, tokenID) => ``,
            gasLimit: 400000
        },
        contracts: {
            whiteListContract: '0x70cb8b66725b0a2356abd882fe73940a3835608e',
            adminAddress: '0xD25A41039DEfD7c7F0fBF6Db3D1Df60b232c6067',
        }
    },
    near_testnet: {
        meta: {
            title: 'Near testnet',
            image: 'near',
            chainId: 0,
            transactionExplorer: "https://explorer.testnet.near.org/transactions/",
            accountExplorer: "https://explorer.testnet.near.org/accounts/",
            marketplaceExplorer: (contractAddress, tokenID) => `https://testnet.mintbase.io/thing/${tokenID}:${contractAddress}`,
            gasLimit: 400000
        },
        contracts: {
            characterContract: 'character2.donft_test.testnet',
            thingContract: 'items2.donft_test.testnet',
            colorContract: 'colors2.donft_test.testnet',
            achievements: 'achievements2.donft_test.testnet',
            whiteListContract: 'dev-1664104716896-68351623310303',
            adminAddress: 'mkrd.testnet',
        }
    },
}
Object.freeze(networks)

export function getAvailableNetworks() {
    return Object.entries(networks)
        .filter(([name, {meta, contracts}]) => {
            return !!+process.env[`VUE_APP_NETWORK_${name.toUpperCase()}_SUPPORT`] &&
                meta.title &&
                (meta.chainId || meta.image === 'near') &&
                contracts.whiteListContract &&
                contracts.adminAddress
        })
        .map(([name, {meta: {title, image, chainId}}], index) => ({
            id: chainId,
            name: title,
            key: image,
            available: true
        }))
}

export function getNameByChainID(chainID){
    const [name] = Object.entries(networks).find(([, data]) => data.meta.chainId === chainID) || ['unknown']
    let isSupport = (name !== 'unknown')? !!+process.env[`VUE_APP_NETWORK_${name.toUpperCase()}_SUPPORT`] : false
    return isSupport? name : 'unknown'
}

export function getData(networkName){
    return networks[networkName.toLowerCase()]?.meta || null
}

export function getSettings(networkName){
    return networks[networkName.toLowerCase()]?.contracts || null
}