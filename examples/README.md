# Examples

Runnable TypeScript for the DeFindex user flows in `skills/integrating-defindex`. Node 20 or later.

```bash
cd examples
npm install
export DEFINDEX_API_KEY=sk_...   # from https://console.defindex.io, works on both networks
```

| Script | Key | What it does |
|---|---|---|
| `npm run discover` / `-- --mainnet` | no | Lists the main vaults and their APY; on mainnet also the strategies |
| `npm run position -- --mainnet G... [C...]` | yes | Reads a vault, its APY and a user's shares and underlying balance |
| `npm run deposit-withdraw:fetch` | yes | Testnet, end to end with plain `fetch`: a Friendbot account deposits 10 XLM into the testnet XLM vault, checks the shares, withdraws everything with `withdraw-shares` and checks it reached zero |
| `npm run deposit-withdraw:sdk` | yes | The same flow with `@defindex/sdk` |
| `... -- --mainnet G...` on either deposit script | yes | Builds the unsigned mainnet deposit for `G...` and prints it. Nothing is signed or submitted |

The examples never submit on mainnet: the only signer they create is a throwaway Friendbot keypair,
and `assertTestnetForSubmit()` stops any submission when `--mainnet` is set.

Set `VAULT=C...` to use another vault. Testnet vault addresses come from
[testnet.contracts.json](https://github.com/defindex-io/stellar-contracts/blob/main/public/testnet.contracts.json)
and change when Stellar resets testnet.

`npm run typecheck` runs in CI.
