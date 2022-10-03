<template>
  <div class="choose-assets">
    <template v-if="step === 'select'">
      <div class="preview__sub-title">
        Choose asset
      </div>
      <div class="preview__modifiers">

        <ContractElement
          v-for="contract in preview.modifiers"
          :contract="contract"
          :selectedTokens="selected.identities"
          :byAvailable="true"
          @chooseToken="chooseToken($event)"
        />

      </div>
      <div class="preview__controls">
        <span></span>
        <div
          class="btn"
          v-show="selected.assets.length"
          @click="confirm"
        >Add</div>
      </div>
    </template>
    <LoaderElement v-if="applying" class="absolute with-bg">Applying...</LoaderElement>
  </div>
</template>

<script setup>
import {reactive, ref} from "vue";
import {stringCompare} from "@/utils/string";
import {useStore} from "@/store/main";
import {storeToRefs} from "pinia";
import ContractElement from '@/components/gallery/Contract'
import LoaderElement from '@/components/UI/Loader'
import AppConnector from "@/crypto/AppConnector";
import alert from "@/utils/alert";
import {ConnectorTypes, getErrorTextByCode} from "@/crypto/helpers";
import TrnView from "@/utils/TrnView";

const store = useStore()
const {
    preview
} = storeToRefs(store);

const step = ref('select')
const selected = reactive({
    assets: [],
    identities: []
})
const chooseToken = (token) => {
    const identity = token.identity
    if(selected.identities.includes(identity)){
        selected.assets.splice(selected.assets.findIndex(t => stringCompare(t.identity, identity)), 1)
        selected.identities.splice(selected.identities.indexOf(identity), 1)
    }
    else {
        selected.assets.push(token)
        selected.identities.push(identity)
    }
}

const emits = defineEmits(['close'])

const applying = ref(false)
const confirm = async () => {
    try{
        applying.value = true
        const assetType = preview.value.modifiers[0].type

        if (AppConnector.type === ConnectorTypes.NEAR) {
            await AppConnector.connector.applyAssetsToToken(preview.value.token, selected.assets, assetType)
        }
        else {
            const contractsNeedToUpdate = [preview.value.token.contractAddress]
                .concat(selected.assets.map(token => token.contractAddress))

            const {
                transactionHash: hash,
                tempImage
            } = await AppConnector.connector.applyAssetsToToken(preview.value.token, selected.assets, assetType)

            TrnView
                .open({hash})
                .onClose(async () => {
                    console.log('contractsNeedToUpdate', contractsNeedToUpdate);
                    emits('close')
                    if(preview.value.notOwner) window.location.reload()
                    else await AppConnector.connector.updateContractTokensList(contractsNeedToUpdate)
                })
        }
    }
    catch (e) {
        console.log('Make bundle test error', e)
        alert.open(getErrorTextByCode(e.message) || e.message, 'Error:')
    }
    finally {
        applying.value = false
    }
}
</script>
