<template>
  <Modal
    class="manage-contract"
    @close="close"
    v-if="isOpen"
  >
    <template #title>Mint Premium {{preview.token.name}} NFT</template>
    <template #default>
      <!--        <div class="form__title">Add new collection</div>-->
      <!--<div class="modal__sub-title">
        Loaded collections:
      </div>-->
      <template v-if="!haveEnough">
        <div class="form">
          <div class="field">
            <h3>NFT Price - {{preview.token.price}} $</h3>
          </div>
          <div class="field required">
            <div class="field__name">Choose your asset</div>

            <select class="input default" v-model="form.makerAssetAddress">
              <option value="" disabled selected>Choose asset type</option>
              <option v-for="item in assetsTypes" :key="item.id" :value="item.id" v-text="item.token"></option>
            </select>
          </div>
        </div>
        <div class="modal__footer">
          <span v-if="isDisabled" class="alert">Minimum price {{preview.token.price}} USDc</span>
          <button :disabled="isDisabled" class="btn" @click="createOrder">Submit</button>
        </div>
      </template>
      <LoaderElement v-if="isProcess" class="absolute with-bg">Deploying...</LoaderElement>
    </template>
  </Modal>
</template>

<script setup>
  import Modal from '@/components/UI/Modal'
  import LoaderElement from '@/components/UI/Loader'

  import {useStore} from "@/store/main";
  import AppConnector from "@/crypto/AppConnector";
  // import alert from "@/utils/alert";
  import {storeToRefs} from "pinia";
  import {ref, reactive, computed} from "vue";
  import Web3 from 'web3';
  import { Contract } from "ethers";
  const store = useStore()
  const close = () => store.changeInchOrderOpen(false)
  let haveEnough = ref(false)
  

import {
    ConnectionStore,
    TokensABI,
} from '@/crypto/helpers'

  const assetsTypes = [
    {
      id: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      token: 'USDC'
    },
    {
      id: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
      token: 'DAI'
    },
    {
      id: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
      token: 'wMatic'
    },
  ]

  // todo make more
  const form = reactive({
      takerAssetAddress: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
      takerAmount: '2',
      makerAssetAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  })

  const {
      isInchOrderOpen: isOpen,
      preview,
      connection
  } = storeToRefs(store);

  const isProcess = ref(false)

  const createCollection = () => {
      isProcess.value = true;
  }

  const isDisabled = computed(() => {
    return form.takerAssetAddress ? false : true
  })

  const createOrder = async () => {
    try {
      if (!form.takerAssetAddress) {
        alert('Please fill all fields')
        return
      }

      const abi = TokensABI.erc20.ABI
      const provider = ConnectionStore.getProvider();

      const web3 = new Web3(provider.provider.provider);
      const contract = new web3.eth.Contract(abi, form.makerAssetAddress)
      let balance = await contract.methods.balanceOf(connection.value.userIdentity).call()

      const decimals = await contract.methods.decimals().call()
      const totalAmount = balance.slice(0, -decimals)
      balance = balance.toString()
      balance = balance.substring(0, balance.length - decimals) + "." + balance.substring(balance.length - decimals, balance.length);
    
      form.takerAmount = preview.value.token.price

      if (balance < preview.value.token.price) {
        alert('Sorry, you don"t have enough funds')
        return
      }

      const order = {
        ...form,
        walletAddress: connection.value.userIdentity,
      }

      await AppConnector.connector.formHandler(order, preview.value)
      close()
    } catch(err) {
      console.log(err, 'create order')
    }
  }
</script>