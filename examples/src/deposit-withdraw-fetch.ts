// Deposit, read the position, then withdraw everything with withdraw-shares. Plain fetch.
//
//   npm run deposit-withdraw:fetch              testnet, end to end: a Friendbot account deposits
//                                               10 XLM into the testnet XLM vault, then exits fully
//   npm run deposit-withdraw:fetch -- --mainnet G...  mainnet, builds the unsigned deposit for G...
//                                               and prints it. Never signs, never submits.
//
// Needs DEFINDEX_API_KEY.
import { apiKey, assertTestnetForSubmit, DEFAULT_VAULT, dfx, friendbotKeypair, NETWORK, sign } from './lib.js'

type Build = { xdr: string | null; functionName: string; operationXDR: string; isSmartWallet: boolean }
type Sent = { txHash: string; success: boolean; result: { type: string } | null }
type Balance = { dfTokens: number; underlyingBalance: number[] }
type VaultInfo = { name: string; assets: { address: string; symbol: string }[] }

const key = apiKey()
const vault = process.env.VAULT ?? DEFAULT_VAULT[NETWORK]
const AMOUNT = 100_000_000 // 10 units of a 7-decimal asset

// 1. Read the vault before building: one amount per asset, in this order.
const info = await dfx<VaultInfo>('GET', `/vault/${vault}`, undefined, key)
console.log(`vault ${info.name}: assets ${info.assets.map((a) => a.symbol).join(', ')}`)
const amounts = info.assets.map((_, i) => (i === 0 ? AMOUNT : 0))

if (NETWORK === 'mainnet') {
  const caller = process.argv.slice(2).find((a) => /^G[A-Z2-7]{55}$/.test(a))
  if (!caller) throw new Error('On mainnet pass the depositor: -- --mainnet G...')
  const build = await dfx<Build>('POST', `/vault/${vault}/deposit`, { amounts, caller, invest: true, slippageBps: 50 }, key)
  console.log(`unsigned ${build.functionName} XDR for ${caller} (sign it in your wallet; this script does not submit):`)
  console.log(build.xdr)
  process.exit(0)
}

assertTestnetForSubmit()
const user = await friendbotKeypair()
console.log(`testnet account ${user.publicKey()} funded by Friendbot`)

async function signAndSend(build: Build): Promise<Sent> {
  if (!build.xdr) throw new Error('xdr is null: smart-wallet callers must wrap operationXDR themselves')
  const sent = await dfx<Sent>('POST', '/send', { xdr: sign(build.xdr, user) }, key)
  if (!sent.success) throw new Error(`send failed: ${JSON.stringify(sent)}`)
  return sent
}

// 2. Deposit.
const before = await dfx<Balance>('GET', `/vault/${vault}/balance?from=${user.publicKey()}`, undefined, key)
const deposit = await dfx<Build>('POST', `/vault/${vault}/deposit`, { amounts, caller: user.publicKey(), invest: true, slippageBps: 50 }, key)
const sentDeposit = await signAndSend(deposit)
console.log(`deposit ${sentDeposit.txHash} (${sentDeposit.result?.type})`)

// 3. Reconcile: shares must have gone up.
const after = await dfx<Balance>('GET', `/vault/${vault}/balance?from=${user.publicKey()}`, undefined, key)
console.log(`shares ${before.dfTokens} -> ${after.dfTokens}, underlying ${after.underlyingBalance.join(',')}`)
if (after.dfTokens <= before.dfTokens) throw new Error('deposit did not mint shares')

// 4. Withdraw everything by burning the exact share count (not the underlying amount).
const exit = await dfx<Build>('POST', `/vault/${vault}/withdraw-shares`, { shares: after.dfTokens, caller: user.publicKey(), slippageBps: 50 }, key)
const sentExit = await signAndSend(exit)
console.log(`withdraw-shares ${sentExit.txHash} (${sentExit.result?.type})`)

const final = await dfx<Balance>('GET', `/vault/${vault}/balance?from=${user.publicKey()}`, undefined, key)
console.log(`shares after exit: ${final.dfTokens}`)
if (final.dfTokens !== 0) throw new Error('shares left after withdraw-shares')
