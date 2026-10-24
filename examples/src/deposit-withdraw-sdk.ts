// The same flow as deposit-withdraw-fetch.ts, with @defindex/sdk.
//
//   npm run deposit-withdraw:sdk                      testnet, end to end with a Friendbot account
//   npm run deposit-withdraw:sdk -- --mainnet G...    mainnet, unsigned deposit only, never submitted
import { DefindexSDK, SupportedNetworks } from '@defindex/sdk'
import { API, apiKey, assertTestnetForSubmit, DEFAULT_VAULT, friendbotKeypair, NETWORK, sign } from './lib.js'

const network = NETWORK === 'mainnet' ? SupportedNetworks.MAINNET : SupportedNetworks.TESTNET
const sdk = new DefindexSDK({ apiKey: apiKey(), baseUrl: API, defaultNetwork: network })
const vault = process.env.VAULT ?? DEFAULT_VAULT[NETWORK]
const AMOUNT = 100_000_000 // 10 units of a 7-decimal asset

const info = await sdk.getVaultInfo(vault)
const amounts = info.assets.map((_, i) => (i === 0 ? AMOUNT : 0))
console.log(`vault ${info.name}: ${info.assets.length} asset(s)`)

if (NETWORK === 'mainnet') {
  const caller = process.argv.slice(2).find((a) => /^G[A-Z2-7]{55}$/.test(a))
  if (!caller) throw new Error('On mainnet pass the depositor: -- --mainnet G...')
  const build = await sdk.depositToVault(vault, { amounts, caller, invest: true, slippageBps: 50 })
  console.log(`unsigned ${build.functionName} XDR (not submitted):\n${build.xdr}`)
  process.exit(0)
}

assertTestnetForSubmit()
const user = await friendbotKeypair()
console.log(`testnet account ${user.publicKey()}`)

const deposit = await sdk.depositToVault(vault, { amounts, caller: user.publicKey(), invest: true, slippageBps: 50 })
if (!deposit.xdr) throw new Error('no xdr returned')
const sent = await sdk.sendTransaction(sign(deposit.xdr, user))
console.log(`deposit ${sent.txHash} success=${sent.success}`)

const balance = await sdk.getVaultBalance(vault, user.publicKey())
console.log(`shares ${balance.dfTokens}, underlying ${balance.underlyingBalance.join(',')}`)

const exit = await sdk.withdrawShares(vault, { shares: balance.dfTokens, caller: user.publicKey(), slippageBps: 50 })
if (!exit.xdr) throw new Error('no xdr returned')
const sentExit = await sdk.sendTransaction(sign(exit.xdr, user))
console.log(`withdraw-shares ${sentExit.txHash} success=${sentExit.success}`)

const final = await sdk.getVaultBalance(vault, user.publicKey())
if (final.dfTokens !== 0) throw new Error(`shares left after exit: ${final.dfTokens}`)
console.log('exited fully')
