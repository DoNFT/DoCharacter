import store from "@/crypto/near/store";
import * as API from "near-api-js";
import {Networks, ConnectionStore} from "@/crypto/helpers";

export async function getContractInstance(
    contractId,
    {
        changeMethods = ['nft_mint', 'nft_transfer', 'nft_approve'],
        viewMethods = ['nft_tokens_for_owner']
    } = {}
){
    return new API.Contract(
        store.state.walletConnection.account(),
        contractId,
        {
            changeMethods,
            viewMethods
        }
    )
}

export async function getWhiteListContractInstance(){
    const {whiteListContract} = Networks.getSettings(ConnectionStore.getNetwork().name)
    return getContractInstance(
        whiteListContract,
        {
            changeMethods: ['add_effect_contract_to_list', 'remove_effect_contract_from_list'],
            viewMethods: ['get_effects_list'],
        }
    )
}

export async function getBundleContractInstance(contractAddress){
    return getContractInstance(
        contractAddress,
        {
            changeMethods: ['nft_mint', 'nft_bundle', 'nft_bundle_with_approve', 'nft_unbundle', 'nft_approve', 'nft_transfer', 'remove_token_from_bundle', 'remove_token_from_bundle_metadata', 'add_token_to_bundle', 'add_token_to_bundle_metadata', 'bundle_metadata_update']
        }
    )
}

export async function getCollectionFactoryContractInstance(){
    const {collectionFactory} = Networks.getSettings(ConnectionStore.getNetwork().name)
    return getContractInstance(
        collectionFactory,
        {
            changeMethods: ['create_store'],
            viewMethods: ['get_stores_collection', 'check_contains_store']
        }
    )
}