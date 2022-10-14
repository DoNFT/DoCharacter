import {useStore} from "@/store/main";
import {storeToRefs} from "pinia";
import {computed, ref, watch} from "vue";

export function useWalletConnection(){
    const store = useStore()

    const {
        connection,
        networks: networkOptions,
        wallets: walletOptions
    } = storeToRefs(store);

    const network = ref(null)
    const wallet = ref(null)
    watch(network, (newValue) => {
        if(newValue === 0) wallet.value = null
    })

    const filteredNetworkOptions = computed(() => {
        return [...networkOptions.value].map(w => ({...w})).map((networkItem) => {
            let available = false
            if(networkItem.available){
                if(wallet.value === 'ledger'){
                    if(networkItem.key !== 0) available = true
                }
                else available = true
            }
            networkItem.available = available
            return networkItem
        })
    })

    const filteredWalletOptions = computed(() => {
        return [...walletOptions.value].map(w => ({...w})).map((wallet) => {
            let available = false
            if(wallet.available){
                // wallet selection not available for near network
                available = network.value !== 0;
            }
            wallet.available = available
            return wallet
        })
    })

    const networkAssets = '/img/connect/'

    const submitAvailable = computed(() => {
        if(!network.value) return
        if(network.value !== 0) return wallet.value
        else return !wallet.value
    })

    const isOpen = computed(() => !connection.value.userIdentity)
    return {
        isOpen,
        networks: filteredNetworkOptions,
        wallets: filteredWalletOptions,
        selectedNetwork: network,
        selectedWallet: wallet,
        networkAssets,
        close: () => {
            // can`t close
        },
        setNetwork: value => {
            network.value = value
        },
        setWallet: value => wallet.value = value,
        submitAvailable
    }
}
