<template>
  <div class="admin-contract" :class="{active: isDetailsOpen}">
    <div class="admin-contract__name" v-text="'[' + props.contract.meta.symbol + '] ' + props.contract.meta.name + ' (' +props.contract.meta.totalSupply + ')'" @click="isDetailsOpen = !isDetailsOpen"></div>
    <div class="admin-contract__toggle" @click="isDetailsOpen = !isDetailsOpen">
      <svg viewBox="0 0 24 24"><path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" /></svg>
    </div>
    <div class="admin-contract__address">
      <a
        target="_blank"
        :href="getExplorerLink('account', props.contract.contractAddress)"
      >
        {{ props.contract.contractAddress }}
        <component :is="Icons.newTab" title="Open in explorer"/>
      </a>
      <CopyIcon :value="props.contract.contractAddress"/>
    </div>
    <div class="admin-contract__props">
      <div>Type</div>
      <div v-text="props.contract.type"></div>
      <div>Server URL</div>
      <div v-text="props.contract.serverUrl"></div>
      <div>Owner</div>
      <div v-text="props.contract.owner"></div>
      <div>Only for</div>
      <div v-text="props.contract.onlyFor || 'Any'"></div>
      <div>Total supply</div>
      <div v-text="props.contract.meta.totalSupply"></div>
    </div>
    <div class="admin-contract__actions">
      <span
        class="btn default red"
        @click="remove"
      >Remove</span>
    </div>
    <LoaderElement v-if="isRemoving" class="absolute with-bg">Loading...</LoaderElement>
  </div>
</template>

<script setup>
    import {defineProps, ref} from "vue";

    import Icons from "@/components/UI/icons";
    import CopyIcon from "@/components/UI/CopyIcon";
    import LoaderElement from '@/components/UI/Loader'

    import AppConnector from "@/crypto/AppConnector";
    import alert from "@/utils/alert";
    import confirm from "@/utils/confirm";
    import TrnView from "@/utils/TrnView";

    import {useStore} from "@/store/main";
    import {storeToRefs} from "pinia";
    import {ConnectorTypes} from "@/crypto/helpers";

    const props = defineProps({
        contract: Object
    })

    const store = useStore()
    const {
        preview,
        getExplorerLink
    } = storeToRefs(store);

    const isDetailsOpen = ref(false)
    const isRemoving = ref(false)
    const remove = () => {
        confirm.open('Confirm remove', async () => {
            try{
                isRemoving.value = true
                if (AppConnector.type === ConnectorTypes.NEAR) {
                    await AppConnector.connector.removeContractFromWhiteList(props.contract.contractAddress)
                }
                else {
                    const {transactionHash: hash} = await AppConnector.connector.removeContractFromWhiteList(props.contract.contractAddress)
                    TrnView
                        .open({hash})
                        .onClose(async () => {
                            await AppConnector.connector.getWhiteList({withUpdate: true, withMeta: true})
                            await AppConnector.connector.fetchUserTokens()
                        })
                }
            }
            catch (e) {
                alert.open(e.message)
            }
            finally {
                isRemoving.value = false
            }
        })
    }
</script>