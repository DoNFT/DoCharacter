import {reactive} from "vue";

const state = reactive({
    loading: false,
    nearInstance: null,
    walletConnection: null,
    accountId: null,
    accountInstance: null,
    balance: null,
})

export default {
    state,

    setLoading: (value) => {
        // console.log('setLoading', value)
        state.loading = value
    },
    setNearInstance: (value) => {
        // console.log('setNearInstance', value)
        state.nearInstance = value
    },
    setWalletConnection: (connection) => {
        // console.log('setWalletConnection', connection)
        state.walletConnection = connection
    },
    setAccountId: (id) => {
        // console.log('setAccountId', id)
        state.accountId = id
    },
    setAccount: (acc) => {
        // console.log('setAccount', acc)
        state.accountInstance = acc
    },
    setBalance: (amount) => {
        // console.log('setBalance', amount)
        state.balance = amount
    }
}