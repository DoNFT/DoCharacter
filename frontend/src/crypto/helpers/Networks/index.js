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
            characterContract: '0xB62C4Ac91b2cAA1D002350A69934c394d4DA2283',
            thingContract: '0xeaE16eB54D9A2fd0a76BBD879539C2EC038cE2d1',
            colorContract: '0x48e24d6a6bbaacf6256e7948c9e16601a4f521b8',
            achievements: '0x8c35ebf867323af8246953e99be8a4d5709a19a0',
            whiteListContract: '0x3b3c5c0e75163e89968300a077d45f69212d1beb',
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
            characterContract: '0x55181Ea172ED9205252D559D782bA18488461303',
            thingContract: '0xd4B754464c4C0Ea996C468A7e2B7E41Cc9494E40',
            colorContract: '0x458d5e59BA0590AfDFE1A55226Bd751C7a87477a',
            achievements: '0x2F0689f3bCEF57BeD577310e1c4f1275BE15394a',
            whiteListContract: '0x91b3Bcb5cb609CF307cb365124753a6Fb3bcC58A',
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
            characterContract: '0x55181ea172ed9205252d559d782ba18488461303',
            thingContract: '0xd4B754464c4C0Ea996C468A7e2B7E41Cc9494E40',
            colorContract: '0x2F0689f3bCEF57BeD577310e1c4f1275BE15394a',
            achievements: '0x91b3Bcb5cb609CF307cb365124753a6Fb3bcC58A',
            whiteListContract: '0xdD3610C4c9638d44329c10E23c835754f36D862d',
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
            characterContract: '0xC62aceB4E3ADf93a184433Ccc86BF0852bcaDdF3',
            thingContract: '0x07e853a4191057ac17ae8c37c13577c77b726ae3',
            colorContract: '0x074809423c7c155b0781a97c3efca62c8b9770f3',
            achievements: '0xb050889270daf80bee1fe041439bf312d1db6449',
            whiteListContract: '0x062044f74a978799cfb2101ccfbc5cdbafbc14f0',
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
            characterContract: '0x4438797659A677C249ae58427D013C15d2A4FA5A',
            thingContract: '0x438CE1e9A3701fe9012dAB7Ce42D073ED86d2e4B',
            colorContract: '0x2Ccb9a2B36F997A64466b4eD4229C635F9bB53ac',
            achievements: '0xE13D87772b6D728D84c32D971A62D930A804e70F',
            whiteListContract: '0x6d16BD9F0320F284225e9E634495a1f03Fc7e5B8',
            adminAddress: '0xB9f48fd8fdA9c353a61c34AC9F2feA35A9AB3eeA',
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
                // contracts.characterContract &&
                // contracts.thingContract &&
                // contracts.colorContract &&
                // contracts.achievements &&
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