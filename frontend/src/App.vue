<template>
  <template v-if="isAppReady">
      <router-view/>

      <ManageContracts/>
      <ChooseWalletModal/>
      <DeployContractModal/>
      <FindTokenModal/>
      <AddToWhiteList/>
      <LimitOrderModal/>

      <TransactionViewModal/>

      <ConfirmModal/>
      <AlertModal/>
  </template>
  <LoaderElement v-else class="absolute with-bg"/>

  <WalletConnectQRModal/>
</template>

<script setup>
    import AlertModal from '@/components/UI/Alert'
    import ConfirmModal from '@/components/UI/Confirm'
    import ManageContracts from '@/components/modals/contractManager/Modal'
    import ChooseWalletModal from '@/components/modals/chooseWallet/Modal'
    import LoaderElement from '@/components/UI/Loader'
    import WalletConnectQRModal from '@/components/modals/walletConnectQR/Modal'
    import DeployContractModal from '@/components/modals/deployContract/Modal'
    import LimitOrderModal from '@/components/modals/limitOrder/Modal'
    import TransactionViewModal from '@/components/modals/TransactionView'
    import FindTokenModal from '@/components/modals/FindToken'
    import AddToWhiteList from '@/components/modals/AddToWhiteList'

    import AppConnector from "@/crypto/AppConnector";
    import {useStore} from "@/store/main";
    import {storeToRefs} from "pinia";
    import {onMounted} from "vue";
    const store = useStore()
    const {
        isAppReady
    } = storeToRefs(store);

    onMounted(async () => {
        try{
            await AppConnector.init()
        }
        catch (e){
            console.log('user not connected', e);
        }
        finally {
            store.setAppReady()
        }
    })
</script>