<template>
  <Modal
    class="manage-contract"
    @close="close"
    v-if="isFindTokenOpen"
  >
    <template #title>Find NFT you want to modify</template>
    <template #default>

      <div class="form">
        <div class="field">
          <div class="field__name">Enter contract address</div>
          <input type="text" class="input default" placeholder="0x00..." v-model.trim="form.contractAddress">
        </div>
        <div class="field">
          <div class="field__name">Enter NFT ID</div>
          <input type="text" class="input default" placeholder="" v-model.trim="form.tokenID">
        </div>
        <div class="field" v-show="tokenNotFound">
          <div class="field__name">NFT not found</div>
        </div>
      </div>

      <LoaderElement v-if="isFoundProcess"/>


      <div class="form" v-if="foundToken">
        <TokenElement
          :token="foundToken"
          :isSelected="false"
          @choose="goToTokenDetails"
        />
        <div class="field">
          <div class="field__name">Press NFT to view details</div>
        </div>
      </div>

    </template>
  </Modal>
</template>

<script setup>
  import Modal from '@/components/UI/Modal'
  import LoaderElement from '@/components/UI/Loader'
  import TokenElement from '@/components/gallery/Token'

  import {useRouter} from "vue-router";
  import {useStore} from "@/store/main";
  import alert from "@/utils/alert";
  import {storeToRefs} from "pinia";
  import {reactive, ref, watch} from "vue";
  import AppConnector from "@/crypto/AppConnector";
  import {ConnectorTypes} from "@/crypto/helpers";
  const store = useStore()
  const close = () => {
      store.changeFindTokenView(false)
      form.contractAddress = ''
      form.tokenID = ''
  }

  const {
      isFindTokenOpen
  } = storeToRefs(store);

  const form = reactive({
      contractAddress: '',
      tokenID: ''
  })

  const isFoundProcess = ref(false)
  const tokenNotFound = ref(false)
  const foundToken = ref(false)

  watch(form, async (newForm) => {
      if(newForm.contractAddress.length && newForm.tokenID.length){
          isFoundProcess.value = true
          tokenNotFound.value = false
          try{
              const tokenIdentity = `${newForm.contractAddress}:${newForm.tokenID}`
              if (AppConnector.type === ConnectorTypes.NEAR) {
                  foundToken.value = await AppConnector.connector.findTokenByIdentity(tokenIdentity)
              }
              else {
                  foundToken.value = await AppConnector.connector.getTokenByIdentity(tokenIdentity, true, false)
              }
          }
          catch (e) {
              console.log(e);
              tokenNotFound.value = true
              foundToken.value = false
          }
          finally {
              isFoundProcess.value = false
          }
      }
  })

  const router = useRouter()
  const goToTokenDetails = () => {
      router.push({name: 'TokenDetail', params: {contractAddress: form.contractAddress, tokenID: form.tokenID}})
      close()
  }
</script>