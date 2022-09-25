export function getConfig(data) {
  switch (data.env) {

  case 'production':
  case 'mainnet':
    return {
      networkId: 'mainnet',
      nodeUrl: 'https://rpc.mainnet.near.org',
      contractName: data.contract || data.originContractName,
      walletUrl: 'https://wallet.near.org',
      helperUrl: 'https://helper.mainnet.near.org',
      explorerUrl: 'https://explorer.mainnet.near.org',
    }
  case 'development':
  case 'testnet':
    return {
      networkId: 'testnet',
      nodeUrl: 'https://rpc.testnet.near.org',
      contractName: data.contract || data.originContractName,
      walletUrl: 'https://wallet.testnet.near.org',
      // helperUrl: 'https://helper.testnet.near.org',
      helperUrl: 'https://testnet-api.kitwallet.app',
      explorerUrl: 'https://explorer.testnet.near.org',
    }
  case 'betanet':
    return {
      networkId: 'betanet',
      nodeUrl: 'https://rpc.betanet.near.org',
      contractName: data.contract,
      walletUrl: 'https://wallet.betanet.near.org',
      helperUrl: 'https://helper.betanet.near.org',
      explorerUrl: 'https://explorer.betanet.near.org',
    }
  case 'local':
    return {
      networkId: 'local',
      nodeUrl: 'http://localhost:3030',
      keyPath: `${process.env.HOME}/.near/validator_key.json`,
      walletUrl: 'http://localhost:4000/wallet',
      contractName: data.contract,
    }
  case 'test':
  case 'ci':
    return {
      networkId: 'shared-test',
      nodeUrl: 'https://rpc.ci-testnet.near.org',
      contractName: data.contract,
      masterAccount: 'test.near',
    }
  case 'ci-betanet':
    return {
      networkId: 'shared-test-staging',
      nodeUrl: 'https://rpc.ci-betanet.near.org',
      contractName: data.contract,
      masterAccount: 'test.near',
    }
  default:
    throw Error(`Unconfigured environment '${data.env}'. Can be configured in src/config.js.`)
  }
}