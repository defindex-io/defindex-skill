// Read a vault and a user's position in it. Needs DEFINDEX_API_KEY.
//   npm run position -- --mainnet G...ADDRESS [C...VAULT]
import { apiKey, DEFAULT_VAULT, dfx, NETWORK } from './lib.js'

const [user, vault = DEFAULT_VAULT[NETWORK]] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
if (!user) {
  console.error('Usage: npm run position -- [--mainnet] <G... user> [C... vault]')
  process.exit(2)
}
const key = apiKey()

type VaultInfo = { name: string; symbol: string; assets: { address: string; symbol: string }[]; apy: number; feesBps: { vaultFee: number; defindexFee: number } }
type Balance = { dfTokens: number; underlyingBalance: number[] }

const info = await dfx<VaultInfo>('GET', `/vault/${vault}`, undefined, key)
const { apy } = await dfx<{ apy: number }>('GET', `/vault/${vault}/apy`, undefined, key)
const balance = await dfx<Balance>('GET', `/vault/${vault}/balance?from=${user}`, undefined, key)

console.log(`${info.name} (${info.symbol}) on ${NETWORK}, 7-day APY ${apy}% net of fees, vault fee ${info.feesBps.vaultFee} bps`)
console.log(`shares (dfTokens): ${balance.dfTokens}`)
info.assets.forEach((a, i) => {
  // XLM, USDC and EURC have 7 decimals. For any other asset read decimals() on the token contract.
  const human = (balance.underlyingBalance[i] ?? 0) / 1e7
  console.log(`  ${a.symbol}: ${human} (${balance.underlyingBalance[i] ?? 0} in smallest units)`)
})
