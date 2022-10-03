import contracts from "@/crypto/near/contracts";

export async function getTokensByAccountId(accountId) {
    let tokens = []
    const endpoint = contracts.character.helperUrl
    try {
        const url = `${endpoint}/account/${accountId}/likelyNFTs`
        tokens = await fetch(url, {
            headers: {
                'max-age': '300'
            }
        })
        .then((res) => res.json())
    } catch(e) {
        console.log('Fetching tokens error', e)
    }
    return tokens.filter(contractName => contractName !== 'undefined')
}