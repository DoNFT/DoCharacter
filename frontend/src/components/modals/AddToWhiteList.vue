<template>
  <Modal
    class="manage-contract"
    @close="close"
    v-if="isOpen"
  >
    <template #title>Add to white list</template>
    <template #default>

      <div class="form">
        <div class="field required">
          <div class="field__name">Contract address</div>
          <input type="text" class="input default" v-model.trim="form.contractAddress">
        </div>
        <div class="field required">
          <div class="field__name">Contract type</div>
          <select class="input default" v-model="form.type">
            <option :value="null" disabled>Choose contract type</option>
            <option v-for="(key, value) in CollectionType.enum" :value="key" v-text="value"></option>
          </select>
        </div>
        <div class="field required">
          <div class="field__name">Server URL</div>
          <input type="text" class="input default" v-model.trim="form.serverUrl">
        </div>
        <div class="field required">
          <div class="field__name">Owner</div>
          <input type="text" class="input default" v-model.trim="form.owner">
        </div>
        <div class="field">
          <div class="field__name">Can apply only for</div>
          <input type="text" class="input default" v-model.trim="form.onlyFor">
        </div>
        <div>
          <button class="btn" @click="add">Add to white list</button>
        </div>

      </div>

      <LoaderElement v-if="isLoading" class="absolute with-bg"/>

    </template>
  </Modal>
</template>

<script setup>
  import Modal from '@/components/UI/Modal'
  import LoaderElement from '@/components/UI/Loader'
  import TokenElement from '@/components/gallery/Token'

  import {useStore} from "@/store/main";
  import alert from "@/utils/alert";
  import {storeToRefs} from "pinia";
  import {reactive, ref} from "vue";
  import AppConnector from "@/crypto/AppConnector";
  import TrnView from "@/utils/TrnView";
  import {CollectionType} from "@/utils/collection";
  import {ConnectorTypes} from "@/crypto/helpers";
  const store = useStore()

  const {
      isAddToWhiteListOpen: isOpen
  } = storeToRefs(store);

  const form = reactive({
      contractAddress: '',
      serverUrl: '',
      owner: '',
      onlyFor: '',
      type: CollectionType.enum.NONE
  })

  const close = () => {
      store.changeAddToWhiteListState(false)
      form.contractAddress = ''
      form.serverUrl = ''
      form.owner = ''
      form.onlyFor = ''
      form.type = CollectionType.enum.NONE
  }

  const isLoading = ref(false)

  const add = async () => {
      if(form.contractAddress.length && form.serverUrl.length && form.owner.length){
          isLoading.value = true
          try{
              if (AppConnector.type === ConnectorTypes.NEAR) {
                  await AppConnector.connector.addContractToWhiteList(form)
              }
              else {
                  const {transactionHash: hash} = await AppConnector.connector.addContractToWhiteList(form)
                  TrnView
                      .open({hash})
                      .onClose(async () => {
                          close()
                          await AppConnector.connector.getWhiteList({withUpdate: true, withMeta: true})
                          await AppConnector.connector.fetchUserTokens()
                      })
              }
          }
          catch (e) {
              console.log(e);
              alert.open(e.message)
          }
          finally {
              isLoading.value = false
          }
      }
  }
</script>