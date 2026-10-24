// Keyless: list the main vaults and the strategies behind them.
//   npm run discover            (testnet)
//   npm run discover -- --mainnet
import { dfx, NETWORK } from './lib.js'

type Discover = { totalVaults: number; vaults: { address: string; apy: number; totalManagedFunds: { asset: string; total_amount: string }[] | null }[] }
type Strategy = { address: string; name: string; asset: string; tvl: string; apy7d: string }

const discover = await dfx<Discover>('GET', '/vault/discover')
console.log(`${discover.totalVaults} vaults on ${NETWORK}`)
for (const v of [...discover.vaults].sort((a, b) => b.apy - a.apy)) {
  const funds = (v.totalManagedFunds ?? []).map((f) => `${f.asset.slice(0, 6)}…:${f.total_amount}`).join(' ')
  console.log(`  ${v.address}  apy ${v.apy.toFixed(2)}%  ${funds}`)
}

if (NETWORK === 'mainnet') {
  const strategies = await dfx<Strategy[]>('GET', '/strategies')
  console.log(`\n${strategies.length} strategies`)
  for (const s of strategies.slice(0, 10)) console.log(`  ${s.name.padEnd(40)} ${s.address}`)
}
