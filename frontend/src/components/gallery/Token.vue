<template>
  <div
    class="token"
    :class="{selected: isSelected, premium: token.premium}"
    @click="choose"
  >
    <div class="token__price" v-if="token.premium">Price - <b>{{`${token.price} $`}}</b></div>
    <div class="token__img" :style="computeTokenImgStyle(token.image)"></div>
    <div class="token__name" v-text="token.name"></div>
    <div class="token__buy btn" v-if="token.isForBuy && !token.premium" @click="mint">Mint</div>
    <div class="token__buy btn inverse" v-else-if="!token.id" @click="orderWithMint">Buy and mint</div>
    <LoaderElement v-if="isLoading" class="absolute with-bg">Minting...</LoaderElement>
  </div>
</template>

<script setup>
    import {computeTokenImgStyle} from "@/utils/styles";
    import AppConnector from "@/crypto/AppConnector";
    import TrnView from "@/utils/TrnView";
    import alert from "@/utils/alert";
    import LoaderElement from '@/components/UI/Loader'
    import {ref} from "vue";
    import {useStore} from "@/store/main";
    import {ConnectorTypes, getErrorTextByCode} from "@/crypto/helpers";

    const store = useStore()
    const props = defineProps({
        token: Object,
        isSelected: {
            type: Boolean,
            default: false
        }
    })
    const emits = defineEmits(['choose'])
    const choose = () => {
        if(!props.token.isForBuy) emits('choose')
    }
    const isLoading = ref(false)

    // for minting popup with Price
    const orderWithMint = async () => {
        try{
            isLoading.value = true
            store.changeInchOrderOpen(true)
            store.passPremiumPreview(props.token, false)
        }
        catch (e) {
            console.log('Mint test error', e)
            alert.open(getErrorTextByCode(e.message) || e.message, 'Error:')
        }
        finally {
            isLoading.value = false
        }
    }

    // for usual minting without Price
    const mint = async () => {
        try{
            isLoading.value = true

            if (AppConnector.type === ConnectorTypes.NEAR) {
                await AppConnector.connector.mintTestToken(props.token)
            }
            else {
                const {transactionHash} = await AppConnector.connector.mintTestToken(props.token)
                TrnView
                    .open({hash: transactionHash})
                    .onClose(async () => {
                        await AppConnector.connector.updateContractTokensList([props.token.contractAddress])
                    })
            }
        }
        catch (e) {
            console.log('Mint test error', e)
            alert.open(getErrorTextByCode(e.message) || e.message, 'Error:')
        }
        finally {
            isLoading.value = false
        }
    }
</script>
