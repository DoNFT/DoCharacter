import {defineStore} from "pinia";
import {CollectionType} from "@/utils/collection";
import {catToFixed, stringCompare} from "@/utils/string";
import ModalController from "@/components/helpers/ModalController";
import {Networks} from "@/crypto/helpers";

export const useStore = defineStore('main', {
    state: () => ({
        isAppReady: false,
        collections: [],
        isCollectionsLoading: false,
        preview: {
            isOpen: false,
            uniqueKey: '',
            token: null,        //  for view
            contract: null,     //  system
            collection: null,   //  system
            modifiers: [],      //  for view
            notOwner: false
        },
        isInchOrderOpen: false,
        isManageContractsOpen: false,
        isFindTokenOpen: false,
        isDeployContractOpen: false,
        isWalletConnectModalOpen: false,
        walletConnectCode: '',
        walletConnectCloseHandler: null,

        networks: [
            {id: 1, name: 'Ethereum', key: 'ether', color: '#627EEA', available: true},
            {id: 2, name: 'Mumbai testnet', key: 'polygon', color: '#8247E5', available: true},
            {id: 3, name: 'Matic mainnet', key: 'polygon', color: '#8247E5', available: true},
            {id: 4, name: 'Cronos', key: 'cronos', color: '#8247E5', available: true},
            {id: 5, name: 'Gnosis/sokol', key: 'gnosis', color: '#8247E5', available: true},
            {id: 6, name: 'NEON', key: 'neon', color: '#8247E5', available: true},
            {id: 7, name: 'Skale', key: 'skale', color: '#8247E5', available: true},
            {id: 8, name: 'BSC', key: 'bsc', color: '#8247E5', available: true},
            // {id: 3, name: 'Optimizm', key: 'optimizm', color: '#8247E5', available: true},
            // {id: 3, name: 'Skale', key: 'skale', color: '#8247E5', available: true},
        ],
        wallets: [
            {id: 1, name: 'MetaMask', key: 'Metamask', color: '#FFFFFF', available: true},
            {id: 2, name: '1inch', key: '1inch', color: '#0E131D', available: true},
        ],

        connection: {
            userIdentity: null,
            userNetworkName: null,
            userNetworkSupported: false
        },

        explorers: {
            transaction: '',
            account: '',
            block: ''
        },
        shopURL: '',

        processStatus: {
            code: '',
            addition: []
        },
        buyTokens: {
            [CollectionType.CHARACTERS]: [
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/characters/face/1.png',
                    name: 'Female 1',
                    cid: 'bafybeidkahssi6ngqqnxxc5v53vxebumhcvczqugng5uhxgoizzijk54im/file'
                },
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/characters/face/2.png',
                    name: 'Female 2',
                    cid: 'bafybeibf7gqg6tyd6ixxx5iebebitsbsjvkndhrzhgsgorqwwuc7f64wlm/file'
                },
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/characters/face/3.png',
                    name: 'Female 3',
                    cid: 'bafybeif2762ptmo6widom7oh7lejcivif7kqiskmh5mmsl4lzg65457orq/file'
                },
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/characters/face/4.png',
                    name: 'Female 4',
                    cid: 'bafybeifgnwr6dvjrqejvxyvmipdzi22ncr7b6qzp5tgbzlxuvgm42wexrq/file'
                },
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/characters/face/male_1.png',
                    name: 'Male 1',
                    cid: 'bafybeibemihfbshcidzlqaaa56pmyl4d6nfiat4ytuyuydf6mme4enhtya/file'
                },
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/characters/face/male_2.png',
                    name: 'Male 2',
                    cid: 'bafybeievdgbjrkv6lq6hx32a73v3ltwsup4fapigpcpiaefp3drfc7ifcy/file'
                },
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/characters/face/male_3.png',
                    name: 'Male 3',
                    cid: 'bafybeia4qjytxw3yv23lm3psdpcj3vlktb3ud7mkq2eumdd6c22jmzma5i/file'
                },
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/characters/face/male_4.png',
                    name: 'Male 4',
                    cid: 'bafybeiemv3vwdbz7ishjlyxb347uamcmfei66752q7j6mneuhmn7btcnc4/file'
                },
                {
                    isForBuy: true,
                    premium: true,
                    price: 3,
                    image: '/img/characters/face/ape.png',
                    name: 'Ape',
                    cid: 'bafybeibbz7hbhyjcdeor77u6a3bbel56yljs3nnmg5kyyiecuakg2apupi/file'
                },
                {
                    isForBuy: true,
                    premium: true,
                    price: 5,
                    image: '/img/characters/face/alien.png',
                    name: 'Alien',
                    cid: 'bafybeidx3tfvtef5hmr43t7mgxegjp3roas765vfkuskcupn7oofrnc6my/file'
                },
                {
                    isForBuy: true,
                    premium: true,
                    price: 7,
                    image: '/img/characters/face/zombie.png',
                    name: 'Zombie',
                    cid: 'bafybeiblmnijaqzoortjslt6fgppchrv3t6mb5e3jazfj6smepzjhrnunm/file'
                },
            ],
            [CollectionType.THINGS]: [
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/characters/hair/1.png',
                    name: 'Hair 1',
                    cid: 'bafybeidhr5fhz2xwbgw3azjm5qvnvro4oxmx7jvnyvxadbyxbokt2ynvue/file'
                },
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/characters/hair/2.png',
                    name: 'Hair 2',
                    cid: 'bafybeiaat5uuwlgoaj3dsxmwpu2w3wh7exjz7garojnbvlcw67jwz2n47e/file'
                },
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/characters/hair/3.png',
                    name: 'Hair 3',
                    cid: 'bafybeib6se6atmpyc7zpy5xz2hizlnnrl5aupde7xenxluxkbldu6qxi4y/file'
                },
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/characters/hair/4.png',
                    name: 'Hair 4',
                    cid: 'bafybeiclpmzde2hseubj4detk2mzno5z5dbow4zyuvt6uuyleodkuivwva/file'
                },
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/characters/hair/5.png',
                    name: 'Hair 5',
                    cid: 'bafybeico4olv6iern6ukkyqoysaz4ibp5tijs3cej3o7ovkt7e2af2pvji/file'
                },
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/characters/hair/6.png',
                    name: 'Hair 6',
                    cid: 'bafybeidyejgv3hjbc2ttld2nlj5sppzumcs53gu3ygxu4mtpfqmj4cwbse/file'
                },
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/characters/hair/7.png',
                    name: 'Hair 7',
                    cid: 'bafybeiholriex36v7mbabh7lz6j3dnnh2n6lndhie4cxp72cesu6dshcqe/file'
                },
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/characters/hair/8.png',
                    name: 'Hair 8',
                    cid: 'bafybeigv73glblqda5gmitlmfe3dniibsyb43qxqxkxyxspnxt2u5kfcie/file'
                },
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/characters/hair/9.png',
                    name: 'Hair 9',
                    cid: 'bafybeigmoqwc5rfq2hi6i4xpaad6nrrecjdavnjytviekcihk66mkvbbfy/file'
                },
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/characters/hair/10.png',
                    name: 'Hair 10',
                    cid: 'bafybeid6cylagkonmu7hitwp2qxtahwbgezr2632gjgpqfpgupmhnujkiq/file'
                },
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/characters/glasses/1.png',
                    name: 'Glasses 1',
                    cid: 'bafybeicra5rzr46wrg7xsgcu6mu54ghigzzi52dawdv2wzuomkqsdiywee/file'
                },
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/characters/glasses/2.png',
                    name: 'Glasses 2',
                    cid: 'bafybeibuhxel27d5764axen2g4nciwi24u2wqr2bq56xjcibycdzvtkymm/file'
                },
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/characters/cheek/1.png',
                    name: 'Cheek 1',
                    cid: 'bafybeicmru32qiowb2o2xnyno35c5sp6p6ov5q56ib7fea2kb42zef34ra/file'
                },
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/characters/bread/1.png',
                    name: 'Bread 1',
                    cid: 'bafybeif3ojjcsohv4y5br24vioaxyx2ys4ljwivhxdmliwjbbp3pmyxssa/file'
                },
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/characters/bread/2.png',
                    name: 'Bread 2',
                    cid: 'bafybeierl56djn725qoag3bs7leqoyknlhn756ynodhl7zsooyactjd46i/file'
                },
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/characters/bread/3.png',
                    name: 'Bread 3',
                    cid: 'bafybeib2ywmrilcerlcqwh734d6j5hxnmp6bccn4ja7ll24ugcrzkswppa/file'
                },
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/characters/bread/4.png',
                    name: 'Bread 4',
                    cid: 'bafybeicvbzavb4chjxeq7iwfoaoniivuzsl5miikxmtz7ggztflvszzz6e/file'
                },
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/characters/chain/1.png',
                    name: 'Chain 1',
                    cid: 'bafybeifajjzw4cte4szzqqw5s2frjnldq33znn24zjor47bnuilzphrqqy/file'
                },
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/characters/chain/2.png',
                    name: 'Chain 2',
                    cid: 'bafybeid4ismx74rdqsj34akfdyfev6s52u2h4sgqxtdm3sszayvp4frpmu/file'
                }
            ],
            [CollectionType.COLORS]: [
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/colors/blue.png',
                    name: 'Space',
                    cid: 'bafybeihb3ccw3ochkhnxxxmur2uuozepq7x4hbbsstmgouszlfshmziz2e/file'
                },
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/colors/green.png',
                    name: 'Green forest',
                    cid: 'bafybeiefjqx7xztce2iovh324admvskek6asdtexqvu7whh7clh7w2cev4/file'
                },
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/colors/orange.png',
                    name: 'Orange',
                    cid: 'bafybeigvz7hlelunukeuvmhtkeplb7y55atxhjw5e73jnqz24w2xu4rhzq/file'
                },
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/colors/red.png',
                    name: 'Red',
                    cid: 'bafybeih3tgnhostmbczb5at34aoksngtg2ydwpwstxfsqfiz733wvck7k4/file'
                },
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/colors/rose.png',
                    name: 'Rose',
                    cid: 'bafybeifjscwbpt7lgtaekhvejr4zgtl4dbtj5qtapxrqjef46ein34hklm/file'
                },
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/colors/brown.png',
                    name: 'Brown',
                    cid: 'bafybeihbctp7vdkblywjr5bwbtsr2p6hrjacivmtty6hv4tkxlutopipwu/file'
                }
            ],
            [CollectionType.ACHIEVEMENTS]: [
                {
                    isForBuy: true,
                    premium: false,
                    image: '/img/achievements/01.jpg',
                    name: 'Achievement',
                    cid: 'bafybeiflnp64da53njqahnlnzkeqnw6p3rn76wzkqiysmnbyivw2jrtyea/file'
                }
            ]
        },

        whiteList: [],
        isWhiteListLoading: false,
        isAddToWhiteListOpen: false
    }),
    getters: {
        getFilteredCollections: state => type => {
            switch (type) {
                case CollectionType.CHARACTERS:
                    return state.collections.map(collection => collection.character)
                case CollectionType.THINGS:
                    return state.collections
                        .filter(collection => collection.things.length)
                        .map(collection => collection.things).flat()
                case CollectionType.COLORS:
                    return state.collections
                        .filter(collection => collection.colors.length)
                        .map(collection => collection.colors).flat()
                case CollectionType.ACHIEVEMENTS:
                    return state.collections
                        .filter(collection => collection.achievements.length)
                        .map(collection => collection.achievements).flat()
                default:
                    return []
            }
        },
        userIdentityShort: state => catToFixed(state.connection.userIdentity || ''),
        getExplorerLink: state => (type, hash = '') => {
            return state.explorers[type]? state.explorers[type] + hash : state.explorers.transaction + hash
        },
        getShopTokens: state => (type, contractAddress) => {
            console.log('getShopTokens', type)
            if(type === CollectionType.CHARACTERS){
                return [...state.buyTokens[CollectionType.CHARACTERS]].map(token => {
                    token.contractAddress = contractAddress
                    return token
                })
            }
            else if(type === CollectionType.THINGS){
                return [...state.buyTokens[CollectionType.THINGS]].map(token => {
                    token.contractAddress = contractAddress
                    return token
                })
            }
            else if(type === CollectionType.COLORS){
                return [...state.buyTokens[CollectionType.COLORS]].map(token => {
                    token.contractAddress = contractAddress
                    return token
                })
            }
            else if(type === CollectionType.ACHIEVEMENTS){
                return [...state.buyTokens[CollectionType.ACHIEVEMENTS]].map(token => {
                    token.contractAddress = contractAddress
                    return token
                })
            }
            return []
        },
        findContractObject: state => (contractAddress) => {
            const collection = state.collections.find(collection => {
                return stringCompare(collection.character.address, contractAddress) ||
                    collection.things.find(thing => stringCompare(thing.address, contractAddress)) ||
                    collection.colors.find(color => stringCompare(color.address, contractAddress)) ||
                    collection.achievements.find(color => stringCompare(color.address, contractAddress))
            })
            if(collection){
                const contract = stringCompare(collection.character.address, contractAddress) && collection.character ||
                    collection.things.find(thing => stringCompare(thing.address, contractAddress)) ||
                    collection.colors.find(color => stringCompare(color.address, contractAddress)) ||
                    collection.achievements.find(color => stringCompare(color.address, contractAddress))
                return {
                    collection,
                    contract
                }
            }
            return null
        }
    },
    actions: {
        changeWhiteListLoadingState(value){
            this.isWhiteListLoading = value
        },
        changeAddToWhiteListState(value){
            this.isAddToWhiteListOpen = value
        },
        setWhiteList(list){
            this.whiteList = list
            console.log('Set whitelist', list)
        },
        updateContractTokens(contractAddress, tokens){
            const isExist = this.findContractObject(contractAddress)
            if(isExist) isExist.contract.tokens = tokens
        },
        changeContractUpdating(contractAddress, value){
            const isExist = this.findContractObject(contractAddress)
            if(isExist) isExist.contract.isUpdating = value
        },
        changeCollectionLoadingState(value){
            this.isCollectionsLoading = value
        },
        setCollections(collections){
            this.collections = collections
            console.log('setCollections', collections)
        },
        setProcessStatus(statusCode = '', ...additionParams){
            this.processStatus.code = statusCode
            this.processStatus.addition.splice(0, this.processStatus.addition.length, ...additionParams)
        },
        openWalletConnectQR(copyCode, closeHandler){
            this.walletConnectCode = copyCode
            this.walletConnectCloseHandler = closeHandler
            this.isWalletConnectModalOpen = true
        },
        closeWalletConnectQR({isAutomatic = false} = {}){
            if(!isAutomatic && this.walletConnectCloseHandler) this.walletConnectCloseHandler()
            this.isWalletConnectModalOpen = false
            this.walletConnectCloseHandler = null
        },
        setAppReady(){
            this.isAppReady = true
        },
        setUserIdentity(value = null){
            this.connection.userIdentity = value
        },
        setUserNetworkName(value = null){
            this.connection.userNetworkName = value
            if(value){
                const {
                    transactionExplorer,
                    accountExplorer,
                    blockExplorer
                } = Networks.getData(value)
                this.explorers.transaction = transactionExplorer
                this.explorers.account = accountExplorer
                this.explorers.block = blockExplorer
                const {store} = Networks.getSettings(value)
                this.shopURL = store
            }
        },
        changeManageContractView(value){
            this.isManageContractsOpen = value
        },
        changeInchOrderOpen(value){
            console.log('changeInchOrderOpen')
            this.isInchOrderOpen = value
        },
        changeFindTokenView(value){
            this.isFindTokenOpen = value
        },
        openPreview(token, notOwner = false) {
            // find collection and contract
            const isExist = this.findContractObject(token.contractAddress)
            if(isExist){
                const {collection, contract} = isExist
                const modifiers = contract.type === CollectionType.CHARACTERS && [...collection.things, ...collection.achievements] ||
                    contract.type === CollectionType.THINGS && collection.colors || []

                this.preview.notOwner = notOwner
                this.preview.token = token
                this.preview.contract = contract
                this.preview.collection = collection
                this.preview.modifiers = modifiers
                this.preview.isOpen = true
                ModalController.open(this.preview.uniqueKey = Symbol('preview'))
            }
        },
        passPremiumPreview(token, notOwner = false) {
            console.log(token, 'TOKENS')
            // find collection and contract
            const isExist = this.findContractObject(token.contractAddress)
            if(isExist){
                const {collection, contract} = isExist
                const modifiers = contract.type === CollectionType.CHARACTERS && [...collection.things, ...collection.achievements] ||
                    contract.type === CollectionType.THINGS && collection.colors || []

                this.preview.notOwner = notOwner
                this.preview.token = token
                this.preview.contract = contract
                this.preview.collection = collection
                this.preview.modifiers = modifiers
            }
        },
        closePreview(){
            this.preview.isOpen = false
            setTimeout(() => {
                this.preview.token = this.preview.contract = this.preview.collection = null
                this.preview.modifiers = []
                ModalController.close(this.preview.uniqueKey)
            }, 300)
        }
    }
})