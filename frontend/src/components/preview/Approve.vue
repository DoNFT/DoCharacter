<template>
  <div class="send-form">
    <div class="preview__sub-title">
      Enter address for allow
    </div>
    <InputElement v-model="address" placeholder="Address..."/>
    <div class="send-form__actions">
      <span class="btn" @click="approve">Allow</span>
    </div>
    <LoaderElement v-if="isApproving" class="absolute with-bg">Approving...</LoaderElement>
  </div>
</template>

<script setup>
    import InputElement from '@/components/UI/InputElement'
    import LoaderElement from '@/components/UI/Loader'
    import {ref} from "vue";
    import AppConnector from "@/crypto/AppConnector";
    import TrnView from "@/utils/TrnView";
    import alert from "@/utils/alert";
    import {ConnectorTypes, getErrorTextByCode} from "@/crypto/helpers";

    const address = ref('')

    const emits = defineEmits(['close'])

    const props = defineProps(['token'])

    const isApproving = ref(false)
    const approve = async () => {
        try{
            isApproving.value = true
            if (AppConnector.type === ConnectorTypes.NEAR) {
                await AppConnector.connector.makeAllow(props.token, address.value)
            }
            else {
                const {transactionHash: hash} = await AppConnector.connector.makeAllow(props.token, address.value)
                TrnView
                    .open({hash})
                    .onClose(async () => {
                        emits('close')
                    })
            }
        }
        catch (e) {
            console.log('approve error', e)
            alert.open(getErrorTextByCode(e.message) || e.message, 'Error:')
        }
        finally {
            isApproving.value = false
        }
    }
</script>
