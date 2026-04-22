# Defindex API — All Endpoints

Base URL: `https://api.defindex.io`
Auth header (when required): `Authorization: Bearer <API_KEY>`

---

## Section 1 — Public Endpoints (no auth required)

### GET /health

```http
GET https://api.defindex.io/health
```

Response `200`:
```json
{
  "status": { "reachable": true },
  "indexer": {
    "mainnet": { "database": { "configured": true, "healthy": true, "poolStats": { "totalCount": 5, "idleCount": 3, "waitingCount": 0 } } },
    "testnet": { "database": { "configured": true, "healthy": true } }
  }
}
```

---

### GET /vault/discover

Lists all main Defindex vaults with TVL and APY. Results cached 5 minutes.

```http
GET https://api.defindex.io/vault/discover?network=mainnet
```

Response `200`:
```json
{
  "totalVaults": 3,
  "vaults": [
    {
      "address": "CA2FIPJ7U6BG3N7EOZFI74XPJZOEOD4TYWXFVCIO5VDCHTVAGS6F4UKK",
      "apy": 19.41,
      "totalManagedFunds": [
        { "asset": "CCW67TSZV3...", "total_amount": "7167250947314" }
      ]
    }
  ]
}
```

---

### GET /strategies

Lists all registered strategies with TVL, APY (7d/30d/all-time), name, underlying asset, and type.

```http
GET https://api.defindex.io/strategies?network=mainnet
```

---

### GET /strategies/apy

Historical APY for strategies at a given Unix timestamp (used by DefiLlama adapter).

```http
GET https://api.defindex.io/strategies/apy?network=mainnet&timestamp=1748518054
```

`timestamp` is optional — omit to get current data.

---

### GET /factory/address

Returns the factory contract address for the given network.

```http
GET https://api.defindex.io/factory/address?network=mainnet
```

Response `200`:
```json
{ "address": "GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V" }
```

---

## Section 2 — User Operations (Bearer API key required)

### GET /vault/:address

Returns comprehensive vault info: name, symbol, roles, assets, strategies, TVL breakdown, fees, APY.

```http
GET https://api.defindex.io/vault/CA2FIPJ7U6BG3N7EOZFI74XPJZOEOD4TYWXFVCIO5VDCHTVAGS6F4UKK?network=mainnet
Authorization: Bearer <API_KEY>
```

Response `200` (abbreviated):
```json
{
  "name": "DeFindex-Vault-BeansUsdcVault",
  "symbol": "BNSUSDC",
  "roles": {
    "manager": "G...A",
    "emergencyManager": "G...A",
    "rebalanceManager": "G...A",
    "feeReceiver": "G...A"
  },
  "assets": [
    {
      "address": "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75",
      "name": "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      "symbol": "USDC",
      "strategies": [
        { "address": "CDB2...", "name": "usdc_blend_autocompound_fixed", "paused": false }
      ]
    }
  ],
  "totalManagedFunds": [
    {
      "asset": "CCW67...",
      "idle_amount": "0",
      "invested_amount": "7167250947314",
      "strategy_allocations": [{ "amount": "7167250947314", "paused": false, "strategy_address": "CCSR..." }],
      "total_amount": "7167250947314"
    }
  ],
  "feesBps": { "vaultFee": 0, "defindexFee": 2000 },
  "apy": 19.41
}
```

**Note on amounts:** All amounts are strings representing the smallest unit (stroops, 7 decimals). `7167250947314` = 716,725.0947314 USDC.

---

### GET /vault/:address/balance

Returns a user's vault share balance and its value in underlying assets.

```http
GET https://api.defindex.io/vault/CA2FIPJ.../balance?from=GAZORYCZ...&network=mainnet
Authorization: Bearer <API_KEY>
```

Query params:
- `from` (required) — user's Stellar address
- `network` (required) — `mainnet` or `testnet`

Response `200`:
```json
{
  "dfTokens": 1500000,
  "underlyingBalance": [750000, 1200000]
}
```

- `dfTokens` — vault shares owned (dfTokens)
- `underlyingBalance` — current value in each underlying asset (stroops)

---

### GET /vault/:address/apy

Returns the 7-day APY for the vault.

```http
GET https://api.defindex.io/vault/CA2FIPJ.../apy?network=mainnet
Authorization: Bearer <API_KEY>
```

Response `200`:
```json
{ "apy": 19.4 }
```

---

### POST /vault/:address/deposit

Builds an unsigned Soroban XDR for depositing assets into the vault.

```http
POST https://api.defindex.io/vault/CA2FIPJ.../deposit?network=mainnet
Authorization: Bearer <API_KEY>
Content-Type: application/json

{
  "amounts": [10000000],
  "caller": "GAZORYCZ...",
  "invest": true,
  "slippageBps": 50
}
```

Body fields:
| Field | Type | Required | Description |
|---|---|---|---|
| `amounts` | `number[]` | Yes | Deposit amounts per asset in **stroops** (integers, NOT strings) |
| `caller` | `string` | Yes | Stellar address of the depositor |
| `invest` | `boolean` | No (default: `true`) | Auto-invest into strategy after deposit |
| `slippageBps` | `number` | No (default: `0`) | Slippage tolerance in bps (50 = 0.5%) |

**Critical:** `amounts` must be `number[]`, not `string[]`. Convert bigint: `[Number(amountStroops)]`.

Response `200`:
```json
{ "xdr": "AAAAAgAAAAB...", "simulationResponse": {...}, "functionName": "deposit" }
```

**Decimal reference:**
| Asset | Decimals | 1 unit |
|---|---|---|
| USDC (Stellar SAC) | 7 | `10_000_000 stroops` |
| XLM | 7 | `10_000_000 stroops` |

---

### POST /vault/:address/withdraw

Withdraws specific asset amounts by burning the equivalent vault shares.

```http
POST https://api.defindex.io/vault/CA2FIPJ.../withdraw?network=mainnet
Authorization: Bearer <API_KEY>
Content-Type: application/json

{
  "amounts": [5000000],
  "caller": "GAZORYCZ...",
  "slippageBps": 50
}
```

Body fields:
| Field | Type | Required | Description |
|---|---|---|---|
| `amounts` | `number[]` | Yes | Amounts to withdraw per asset (stroops) |
| `caller` | `string` | Yes | Stellar address of the user |
| `slippageBps` | `number` | No (default: `0`) | Slippage tolerance in bps |

Response `200`: same shape as deposit `{ xdr, simulationResponse, functionName }`.

---

### POST /vault/:address/withdraw-shares

Withdraws by burning a specific number of vault shares (dfTokens).

```http
POST https://api.defindex.io/vault/CA2FIPJ.../withdraw-shares?network=mainnet
Authorization: Bearer <API_KEY>
Content-Type: application/json

{
  "shares": 1000000,
  "caller": "GAZORYCZ...",
  "slippageBps": 50
}
```

Body fields:
| Field | Type | Required | Description |
|---|---|---|---|
| `shares` | `number` | Yes | Number of vault shares (dfTokens) to burn — must be positive integer |
| `caller` | `string` | Yes | Stellar address of the user |
| `slippageBps` | `number` | No (default: `0`) | Slippage tolerance in bps |

Response `200`: `{ xdr, simulationResponse, functionName }`.

---

### POST /send

Submits a signed XDR transaction to the Stellar network.

```http
POST https://api.defindex.io/send?network=mainnet
Authorization: Bearer <API_KEY>
Content-Type: application/json

{ "xdr": "<signed base64 XDR envelope>" }
```

Response `200`:
```json
{
  "txHash": "abc123...",
  "success": true,
  "result": { "type": "vault_deposit", "value": {...} },
  "ledger": 54321,
  "createdAt": "2024-01-15T12:30:00Z",
  "latestLedger": 54322,
  "feeBump": false,
  "feeCharged": "100"
}
```

Always handle multiple hash field names (legacy compat):
```ts
const txHash = json.txHash ?? json.hash ?? json.id;
```

---

### Full Deposit → Send Pattern (TypeScript)

```ts
const API_KEY = process.env.DEFINDEX_API_KEY!;
const VAULT = "CA2FIPJ7U6BG3N7EOZFI74XPJZOEOD4TYWXFVCIO5VDCHTVAGS6F4UKK";
const NETWORK = "mainnet";

// Step 1: get unsigned XDR
const depositRes = await fetch(`https://api.defindex.io/vault/${VAULT}/deposit?network=${NETWORK}`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
  body: JSON.stringify({ amounts: [Number(amountStroops)], caller: stellarAddress, invest: true, slippageBps: 50 }),
});
const { xdr: unsignedXdr } = await depositRes.json();

// Step 2: sign with wallet (Freighter / Privy / Crossmint — see relevant skill)
const signedXdr = await signTransaction(unsignedXdr);

// Step 3: submit
const sendRes = await fetch(`https://api.defindex.io/send?network=${NETWORK}`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
  body: JSON.stringify({ xdr: signedXdr }),
});
const json = await sendRes.json();
const txHash = json.txHash ?? json.hash ?? json.id;
```

---

## Section 3 — Vault Administration (Bearer API key + vault role)

All admin endpoints return `{ xdr, simulationResponse, functionName }` — the XDR must be signed by the caller and submitted via `POST /send`.

### GET /vault/:address/report

Generates performance reports for all strategies in the vault.

```http
GET https://api.defindex.io/vault/CA2FIPJ.../report?network=mainnet
Authorization: Bearer <API_KEY>
```

Response `200`: `{ xdr, simulationResponse, functionName }` — caller signs and submits.

---

### GET /vault/:address/get/:role

Retrieves the address assigned to a vault role.

```http
GET https://api.defindex.io/vault/CA2FIPJ.../get/manager?network=mainnet
Authorization: Bearer <API_KEY>
```

Valid values for `:role`:
- `manager` — full administrative control
- `emergency-manager` — rescue / pause capabilities
- `rebalance-manager` — asset rebalancing permissions
- `fee-receiver` — receives management fees

Response `200`:
```json
{ "function_called": "get_manager", "address": "GAZORYCZ..." }
```

---

### POST /vault/:address/set/:role

Updates the address assigned to a vault role. **Caller must hold the current role (or Manager role).**

```http
POST https://api.defindex.io/vault/CA2FIPJ.../set/manager?network=mainnet
Authorization: Bearer <API_KEY>
Content-Type: application/json

{
  "new_address": "GACKTN5D...",
  "caller": "GCKFBEIY..."
}
```

Body fields:
| Field | Type | Required | Description |
|---|---|---|---|
| `new_address` | `string` | Yes | New role holder's Stellar address |
| `caller` | `string` | Yes | Current role holder's address (signer) |

Valid `:role` values: same as `get/:role` above.

Required role per `:role`:
| Role to set | Required by |
|---|---|
| `manager` | current Manager |
| `emergency-manager` | Manager |
| `rebalance-manager` | Manager |
| `fee-receiver` | Manager or current fee-receiver |

Response `200`: `{ xdr, simulationResponse, functionName }`.

---

### POST /vault/:address/rebalance

Rebalances strategy allocations. **Requires Rebalance Manager role.**

```http
POST https://api.defindex.io/vault/CA2FIPJ.../rebalance?network=mainnet
Authorization: Bearer <API_KEY>
Content-Type: application/json

{
  "caller": "GCKFBEIY...",
  "instructions": [
    { "type": "Invest", "strategy_address": "CDB2...", "amount": 500000 },
    { "type": "Unwind", "strategy_address": "CCSR...", "amount": 300000 },
    { "type": "SwapExactIn", "token_in": "CCW6...", "token_out": "CDLZ...", "amount": 100000, "slippageToleranceBps": 50 }
  ]
}
```

Body fields:
| Field | Type | Required | Description |
|---|---|---|---|
| `caller` | `string` | Yes | Rebalance manager's Stellar address |
| `instructions` | `Instruction[]` | Yes | Ordered list of rebalance operations |

Instruction types:
| Type | Fields | Description |
|---|---|---|
| `Invest` | `strategy_address`, `amount` | Move funds from idle → strategy |
| `Unwind` | `strategy_address`, `amount` | Withdraw from strategy → idle |
| `SwapExactIn` | `token_in`, `token_out`, `amount`, `slippageToleranceBps` | Swap exact input amount |
| `SwapExactOut` | `token_in`, `token_out`, `amount`, `slippageToleranceBps` | Swap to get exact output amount |

Response `200`: `{ xdr, simulationResponse, functionName }`.

---

### POST /vault/:address/lock-fees

Locks accrued fees (optionally updates the fee rate). **Requires Manager role.**

```http
POST https://api.defindex.io/vault/CA2FIPJ.../lock-fees?network=mainnet
Authorization: Bearer <API_KEY>
Content-Type: application/json

{
  "caller": "GCKFBEIY...",
  "new_fee_bps": 100
}
```

Body fields:
| Field | Type | Required | Description |
|---|---|---|---|
| `caller` | `string` | Yes | Manager's Stellar address |
| `new_fee_bps` | `number` | No | New fee in bps (0–10000). Omit to keep current fee |

---

### POST /vault/:address/release-fees

Releases a specific amount of previously locked fees. **Requires Manager role.**

```http
POST https://api.defindex.io/vault/CA2FIPJ.../release-fees?network=mainnet
Authorization: Bearer <API_KEY>
Content-Type: application/json

{
  "caller": "GCKFBEIY...",
  "amount": 1000000,
  "strategy_address": "CDB2..."
}
```

Body fields:
| Field | Type | Required | Description |
|---|---|---|---|
| `caller` | `string` | Yes | Manager's Stellar address |
| `amount` | `number` | Yes | Amount to release (stroops) |
| `strategy_address` | `string` | Yes | Strategy to release fees from |

---

### POST /vault/:address/distribute-fees

Distributes accrued fees to the fee receiver. **Requires Manager role.**

```http
POST https://api.defindex.io/vault/CA2FIPJ.../distribute-fees?network=mainnet
Authorization: Bearer <API_KEY>
Content-Type: application/json

{ "caller": "GCKFBEIY..." }
```

Body fields:
| Field | Type | Required | Description |
|---|---|---|---|
| `caller` | `string` | Yes | Manager's Stellar address |

---

### POST /vault/:address/rescue

Emergency operation to pull assets out of a malfunctioning strategy. **Requires Emergency Manager role.**

```http
POST https://api.defindex.io/vault/CA2FIPJ.../rescue?network=mainnet
Authorization: Bearer <API_KEY>
Content-Type: application/json

{
  "strategy_address": "CDB2...",
  "caller": "GCKFBEIY..."
}
```

Body fields:
| Field | Type | Required | Description |
|---|---|---|---|
| `strategy_address` | `string` | Yes | Strategy to rescue from |
| `caller` | `string` | Yes | Emergency manager's Stellar address |

---

### POST /vault/:address/pause-strategy

Temporarily halts a strategy (no new investments; existing positions remain). **Requires Emergency Manager role.**

```http
POST https://api.defindex.io/vault/CA2FIPJ.../pause-strategy?network=mainnet
Authorization: Bearer <API_KEY>
Content-Type: application/json

{
  "strategy_address": "CDB2...",
  "caller": "GCKFBEIY..."
}
```

---

### POST /vault/:address/unpause-strategy

Resumes a paused strategy. **Requires Emergency Manager role.**

```http
POST https://api.defindex.io/vault/CA2FIPJ.../unpause-strategy?network=mainnet
Authorization: Bearer <API_KEY>
Content-Type: application/json

{
  "strategy_address": "CDB2...",
  "caller": "GCKFBEIY..."
}
```

Body fields for pause / unpause:
| Field | Type | Required | Description |
|---|---|---|---|
| `strategy_address` | `string` | Yes | Strategy contract address |
| `caller` | `string` | Yes | Emergency manager's Stellar address |

---

### POST /vault/:address/upgrade

Upgrades the vault contract to a new WASM hash. **Requires Manager role.**

```http
POST https://api.defindex.io/vault/CA2FIPJ.../upgrade?network=mainnet
Authorization: Bearer <API_KEY>
Content-Type: application/json

{
  "new_wasm_hash": "1234567890abcdef...",
  "caller": "GCKFBEIY..."
}
```

Body fields:
| Field | Type | Required | Description |
|---|---|---|---|
| `new_wasm_hash` | `string` | Yes | New WASM hash for the contract upgrade |
| `caller` | `string` | Yes | Manager's Stellar address |

---

## Section 4 — Factory (Bearer API key required)

All factory POST endpoints return unsigned XDR. Sign the XDR and submit via `POST /send`.

### POST /factory/create-vault

Deploys a new Defindex vault through the factory contract.

```http
POST https://api.defindex.io/factory/create-vault?network=testnet
Authorization: Bearer <API_KEY>
Content-Type: application/json

{
  "roles": {
    "manager": "GACKTN5D...",
    "emergencyManager": "GACKTN5D...",
    "rebalanceManager": "GACKTN5D...",
    "feeReceiver": "GACKTN5D..."
  },
  "vaultFeeBps": 25,
  "assets": [
    {
      "address": "GCKFBEIY...",
      "strategies": [
        { "address": "GCKFBEIY...", "name": "Strategy A", "paused": false }
      ]
    }
  ],
  "name": "MyVault",
  "symbol": "MVLT",
  "upgradable": true,
  "caller": "GACKTN5D..."
}
```

Key body fields:
| Field | Type | Required | Description |
|---|---|---|---|
| `roles` | `object` | Yes | All four role addresses |
| `vaultFeeBps` | `number` | Yes | Vault fee in basis points (0–10000) |
| `assets` | `Asset[]` | Yes | Underlying assets with their strategies |
| `name` | `string` | Yes | Human-readable vault name |
| `symbol` | `string` | Yes | Vault token ticker (dfToken symbol) |
| `upgradable` | `boolean` | Yes | Whether vault contract can be upgraded |
| `caller` | `string` | Yes | Deployer's Stellar address |

Response `200`: `{ xdr, simulationResponse, error }`.

---

### POST /factory/create-vault-deposit

Creates a vault and makes an initial deposit in a single atomic transaction.

```http
POST https://api.defindex.io/factory/create-vault-deposit?network=testnet
Authorization: Bearer <API_KEY>
Content-Type: application/json

{
  "roles": { ... },
  "vaultFeeBps": 25,
  "assets": [ ... ],
  "name": "MyVault",
  "symbol": "MVLT",
  "upgradable": true,
  "caller": "GACKTN5D...",
  "depositAmounts": [100, 200]
}
```

Same fields as `create-vault` plus:
| Field | Type | Required | Description |
|---|---|---|---|
| `depositAmounts` | `number[]` | Yes | Initial deposit amounts per asset (stroops) |

Response `200`: `{ xdr, simulationResponse, error }`.

---

### POST /factory/create-vault-auto-invest

Creates a vault, deposits, and immediately invests via rebalance — all in one batched transaction. Also transfers the manager role to the final address at the end.

```http
POST https://api.defindex.io/factory/create-vault-auto-invest?network=testnet
Authorization: Bearer <API_KEY>
Content-Type: application/json

{
  "caller": "GBZXUKUY...",
  "roles": {
    "manager": "GBAJGSZQ...",
    "emergencyManager": "GBAJGSZQ...",
    "rebalanceManager": "GBAJGSZQ...",
    "feeReceiver": "GBAJGSZQ..."
  },
  "name": "Auto-Invest Vault",
  "symbol": "AIV",
  "vaultFee": 10,
  "upgradable": true,
  "assets": [
    {
      "address": "CDLZFC3S...",
      "symbol": "XLM",
      "amount": 200,
      "strategies": [
        { "address": "CCEE2VAG...", "name": "xlm_hodl_strategy", "amount": 100 },
        { "address": "CAHWRPKB...", "name": "xlm_juice_strategy", "amount": 100 }
      ]
    }
  ]
}
```

Each asset's `amount` = total deposit; each strategy's `amount` = allocation for that strategy (must sum to asset `amount`).

Response `201`:
```json
{
  "xdr": "AAAAAgAAAAA...",
  "predictedVaultAddress": "CCQ2BCKKDX7HSF5TULLRFRKS4RYIC5ZZGYYTBR3XFDLZ6MMZFRJNXIEA",
  "warning": "The vault address is predicted from simulation. Actual address may differ if network state changes."
}
```

---

## Error Reference

| Status | Meaning | Common cause |
|---|---|---|
| `400` | Bad request | Missing required field, invalid Stellar address, wrong network value |
| `401` | Unauthorized | Missing or invalid Bearer token |
| `403` | Forbidden | Caller does not hold the required vault role |
| `404` | Not found | No factory deployed on that network |
| `429` | Rate limit exceeded | Exceeded tier bucket; use `retryAfter` from body |
| `500` | Internal server error | Multiple contract call failures or infrastructure issue |

---

## Known Vault Addresses

| Vault | Network | Address |
|---|---|---|
| Soroswap EARN USDC | Mainnet | `CA2FIPJ7U6BG3N7EOZFI74XPJZOEOD4TYWXFVCIO5VDCHTVAGS6F4UKK` |
| XLM Vault | Testnet | `CCLV4H7WTLJQ7ATLHBBQV2WW3OINF3FOY5XZ7VPHZO7NH3D2ZS4GFSF6` |

**USDC on Stellar (SAC):** `CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75`
**USDC issuer:** `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`
