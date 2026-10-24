# DeFindex API: user endpoints

Base URL `https://api.defindex.io`. Auth `Authorization: Bearer sk_...` from
[console.defindex.io](https://console.defindex.io) unless marked keyless. Every route below takes
`?network=mainnet|testnet` (required unless noted). Verified against `https://api.defindex.io/api-json`;
the CI drift check fails if a path here leaves the spec.

Admin routes are in the `defindex-vault-admin` skill, factory routes in `defindex-create-vault`.

## Keyless

### `GET /health`

Service and indexer status. No `network`.

### `GET /vault/discover`

Main DeFindex vaults with TVL and APY, cached 5 minutes.

```json
{ "totalVaults": 14, "vaults": [ { "address": "CBNKCU3H...", "totalManagedFunds": [ { "asset": "CCW67TSZ...", "total_amount": "2566259705226" } ], "apy": 5.93 } ] }
```

`total_amount` is a string in the asset's smallest unit. `apy` is a percentage.

### `GET /strategies`

Every registered strategy with `address`, `type`, `name`, `asset`, `tvl`, `currentPps` and APY over
7 days, 30 days and all time. `network` is optional here.

## Vault reads

### `GET /vault/{address}`

Name, symbol, roles, `assets[]` with their strategies, `totalManagedFunds[]`
(`idle_amount`, `invested_amount`, `strategy_allocations[]`, `total_amount`, all strings),
`feesBps { vaultFee, defindexFee }`, `apy`, and `managedByStabilizer` (true when the vault is
registered with Stable APY). `vaultFee` is the fee on yield, in bps. `defindexFee` is DeFindex's share
of that fee, in bps of the fee.

### `GET /vault/{address}/apy`

`{ "apy": 5.93 }`: the 7-day APY as a percentage, net of fees.

### `GET /vault/{address}/history`

Price per share, supply, deposits, withdrawals, gains, fees and APY over time.
Query: `period` (`all`, `7d`, `30d`, `90d`, `1y`), `interval` (`hourly`, `daily`, `weekly`, `monthly`),
`startDate`, `endDate` (ISO 8601).

## Positions

### `GET /vault/{address}/balance`

Query `from` (the user's `G...` or `C...` address).

```json
{ "dfTokens": 1500000, "underlyingBalance": [750000] }
```

`dfTokens` is the share count; `underlyingBalance` is their current value per vault asset, as JSON numbers.

### `GET /account/{walletAddress}/vault/{vaultAddress}`

Position value, ROI, APY over 24 h, 7 d, 30 d and since inception, total deposits and withdrawals,
interest earned, and a time series. Query: `interval`, `startDate`, `endDate`, `includeEvents`.

### `GET /account/{walletAddress}/vault/{vaultAddress}/events`

Paginated `deposit`, `withdraw`, `transfer_in`, `transfer_out` events, newest first.
Query: `eventType`, `startDate`, `endDate`, `limit` (default 50), `offset`.

## Builds (return an unsigned XDR)

All return `{ xdr, simulationResponse, functionName, operationXDR, isSmartWallet }`. For a `C...`
caller `xdr` is `null`: build your own transaction around `operationXDR`.

### `POST /vault/{address}/deposit`

| Field | Type | Required | Notes |
|---|---|---|---|
| `amounts` | `number[]` | yes | One integer per vault asset, smallest unit, in `assets[]` order |
| `caller` | `string` | yes | Depositor, signs the transaction |
| `invest` | `boolean` | no, default `true` | Invest right away, following the current allocation |
| `slippageBps` | `number` | no, default `0` | 0 to 10000 |

### `POST /vault/{address}/withdraw`

`{ "amounts": [<int per asset>], "caller": "G...", "slippageBps": 50 }`. Burns the shares needed for those amounts.

### `POST /vault/{address}/withdraw-shares`

`{ "shares": <int>, "caller": "G...", "slippageBps": 50 }`. Burns exactly `shares`. Use it with
`shares = dfTokens` to exit completely.

### `POST /migration/defindex-to-defindex`

`{ "from": "G...", "fromVault": "C...", "toVault": "C...", "slippageBps": 10 }`. One atomic
transaction that withdraws the caller's entire share balance from `fromVault` and deposits it into
`toVault`. Both vaults must hold the same assets in the same order. `network` is optional.

## Submit

### `POST /send`

`{ "xdr": "<signed XDR>" }` →

```json
{ "txHash": "...", "success": true, "result": { "type": "vault_deposit", "value": "..." }, "ledger": 54321, "createdAt": "...", "latestLedger": 54322, "feeBump": false, "feeCharged": "100" }
```

You can also submit the signed XDR through your own Soroban RPC.

## Known addresses

| What | Network | Address |
|---|---|---|
| USDC vault (example used in the API spec) | mainnet | `CBNKCU3HGFKHFOF7JTGXQCNKE3G3DXS5RDBQUKQMIIECYKXPIOUGB2S3` |
| XLM vault (`xlm_paltalabs_vault`) | testnet | `CCLV4H7WTLJQ7ATLHBBQV2WW3OINF3FOY5XZ7VPHZO7NH3D2ZS4GFSF6` |
| BlendUSDC vault (`usdc_paltalabs_vault`) | testnet | `CBMVK2JK6NTOT2O4HNQAIQFJY232BHKGLIMXDVQVHIIZKDACXDFZDWHN` |
| Native XLM SAC | testnet | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |

Testnet addresses come from
[testnet.contracts.json](https://github.com/defindex-io/stellar-contracts/blob/main/public/testnet.contracts.json);
Stellar resets testnet periodically, so re-read it when an address stops working.
