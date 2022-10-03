<template>
  <Sketch class="gallery">
    <LoaderElement class="collections" v-if="isLoading">Loading...</LoaderElement>
    <template v-else-if="token">
      <ToggleElement v-model="isJSON">View in JSON</ToggleElement>
      <div class="token-page">
        <div class="token-page__media">
          <div class="token-page__img">
            <div :style="computeTokenImgStyle(token.image)"></div>
          </div>
        </div>
        <div class="token-page__data">
          <JsonViewer
            v-if="isJSON"
            :jsonObject="Token.generateJsonForTokenList(token.structure)"
          />
          <template v-else>
            <div class="token-page__field">
              <div>Type</div>
              <div></div>
            </div>
            <div class="token-page__field" v-for="field in token.fieldsForView">
              <div v-text="field.key + ':'"></div>
              <div v-text="field.value"></div>
            </div>
          </template>
          <div class="token-page__actions">
            <span class="btn" v-if="isApproved" @click="addToBundle">Modify</span>
          </div>
        </div>
        <div class="token-page__inside">
          <div v-for="nft in token.structure" :key="nft.id" :style="computeTokenImgStyle(nft.image)"></div>
        </div>
        <div></div>
      </div>
    </template>
    <template v-else>
      Token not found
    </template>
  </Sketch>
  <PreviewToken/>
</template>

<script setup>
    import Sketch from '@/components/UI/Sketch'
    import LoaderElement from '@/components/UI/Loader'
    import ToggleElement from '@/components/UI/Toggle'
    import JsonViewer from "@/components/UI/JsonViewer"
    import PreviewToken from '@/components/preview/Modal'

    import {useStore} from "@/store/main";
    import {useRoute} from "vue-router";
    import {onMounted, ref} from "vue";
    import AppConnector from "@/crypto/AppConnector";
    import {computeTokenImgStyle} from "@/utils/styles";
    import {ConnectorTypes, getErrorTextByCode, Token, TokenRoles} from "@/crypto/helpers";
    import confirm from "@/utils/confirm";
    import TrnView from "@/utils/TrnView";
    import alert from "@/utils/alert";

    const isJSON = ref(false)

    const isLoading = ref(true)
    const token = ref(null)
    const tokenNotFound = ref(false)
    const isApproved = ref(true)

    const route = useRoute()
    onMounted(async () => {
        try{
            const tokenIdentity = `${route.params.contractAddress}:${route.params.tokenID}`
            await AppConnector.connector.getWhiteList({withUpdate: true, withMeta: true})
            if (AppConnector.type === ConnectorTypes.NEAR) {
                token.value = await AppConnector.connector.findTokenByIdentity(tokenIdentity)
            }
            else token.value = await AppConnector.connector.getTokenByIdentity(tokenIdentity, true, true)
        }
        catch (e) {
            tokenNotFound.value = true
        }
        finally {
            isLoading.value = false
        }
    })

    const store = useStore()

    const addToBundle = () => {
        store.openPreview(token.value, true)
    }
</script>
