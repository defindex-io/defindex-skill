---
name: integrating-defindex
description: Integrate the DeFindex API (yield vaults) into an app, wallet or backend. Use to discover vaults, read a vault, show a user's earn balance, build deposit, withdraw and withdraw-all transactions, submit them, and handle DeFindex errors. Covers the intent router, the minimal call sequence per flow, units and shares, error codes with retry guidance and production hardening.
license: MIT
metadata:
  author: defindex-io
  version: "1.0.0"
---

# DeFindex API Integration

DeFindex is yield infrastructure for neobanks, fintechs and wallets. Users deposit an asset into a
vault, receive vault shares (dfTokens), and the vault invests across strategies. The API builds
**unsigned** transactions; your app signs them and submits them.

**Base URL**: `https://api.defindex.io`
**Network**: `?network=mainnet` or `?network=testnet` on every vault, factory and `/send` call.
**Auth**: `Authorization: Bearer sk_...`. Get the key at [console.defindex.io](https://console.defindex.io)
(**API Keys** → **Generate API Key**). One active key per account: generating a new one revokes the old one.
**Keyless**: only `GET /health`, `GET /vault/discover` and `GET /strategies`. Everything else answers
`403 {"message":"Forbidden resource"}` without a valid key (403, not 401).

## Use / Do not use

Use when:
- The task calls `api.defindex.io` or `@defindex/sdk`: vaults, deposits, withdrawals, balances, APY.
- The user wants an "earn" or "savings" balance in a wallet or app backed by DeFindex.
- The user is debugging a DeFindex API response or a vault contract error code.

Do not use when:
- The task changes vault roles, fees, strategies or upgrades → `defindex-vault-admin`.
- The task deploys a new vault → `defindex-create-vault`.
- The task is a fixed advertised rate → `defindex-stable-apy`; a funded yield campaign → `defindex-boost`.
- The task is a generic Stellar or Soroban question with no DeFindex call.

## Intent Router (first step)

| User intent | First call | Then |
|---|---|---|
| List vaults, compare APY | `GET /vault/discover?network=mainnet` (keyless) | `GET /vault/{address}` for the one you pick |
| Read one vault (assets, strategies, fees, roles) | `GET /vault/{address}` | — |
| Current APY | `GET /vault/{address}/apy` | — |
| Show a user's position / earn balance | `GET /vault/{address}/balance?from=G...` | `GET /account/{walletAddress}/vault/{vaultAddress}` for ROI and history |
| Activity list for a user | `GET /account/{walletAddress}/vault/{vaultAddress}/events` | — |
| Deposit | `GET /vault/{address}` | `POST /vault/{address}/deposit` → sign → `POST /send` → `GET /vault/{address}/balance` |
| Withdraw an amount of the asset | `GET /vault/{address}/balance` | `POST /vault/{address}/withdraw` → sign → `POST /send` |
| Withdraw everything | `GET /vault/{address}/balance` | `POST /vault/{address}/withdraw-shares` with `shares = dfTokens` → sign → `POST /send` |
| Move a position to another vault | `GET /vault/{address}/balance` | `POST /migration/defindex-to-defindex` → sign → `POST /send` |
| Vault performance chart | `GET /vault/{address}/history` | — |
| Strategies and their APY | `GET /strategies?network=mainnet` (keyless) | — |
| Your fee on a vault (partner fee) | `GET /vault/{address}/fees/status` | changing it is `defindex-vault-admin` |
| Admin: roles, rebalance, fees, rescue, pause, upgrade | use `defindex-vault-admin` | — |
| Create a vault | use `defindex-create-vault` | — |
| Stable APY / Boost | use `defindex-stable-apy` / `defindex-boost` | — |

If you do not have the user's Stellar address, ask for it before any balance or build call.
If you do not have a vault address, call `GET /vault/discover` and let the user choose.

## Minimal execution contracts

Each block is the shortest correct sequence. Full request and response shapes are in
[references/endpoints.md](references/endpoints.md) and the per-endpoint pages under
`https://docs.defindex.io/api-reference/`.

### Read the vault (always before building)

`GET /vault/{address}?network=...` returns `name`, `symbol`, `roles`, `assets[]` (each with
`address`, `symbol`, `strategies[]`), `totalManagedFunds[]`, `feesBps { vaultFee, defindexFee }`
and `apy`. The order of `assets[]` is the order of every `amounts` array you send. Never assume a
vault holds one asset; read it.

### Deposit

1. `GET /vault/{address}` → learn `assets[]` and their decimals.
2. Convert the human amount to the asset's smallest unit (see Units).
3. `POST /vault/{address}/deposit?network=...` with
   `{ "amounts": [<int per asset>], "caller": "G...", "invest": true, "slippageBps": 50 }`.
4. Sign `xdr` with `caller`. Submit with `POST /send?network=...` `{ "xdr": "<signed>" }`, or through your own RPC.
5. Check `success: true` and `txHash`, then `GET /vault/{address}/balance?from=G...` and reconcile.

### Withdraw an amount

`POST /vault/{address}/withdraw` with `{ "amounts": [<int per asset>], "caller": "G...", "slippageBps": 50 }`
→ sign → `POST /send`. `amounts` are in the underlying asset; the vault burns the shares needed.

### Withdraw everything

1. `GET /vault/{address}/balance?from=G...` → `dfTokens`.
2. `POST /vault/{address}/withdraw-shares` with `{ "shares": <dfTokens>, "caller": "G...", "slippageBps": 50 }`.
3. Sign → `POST /send` → read the balance again: `dfTokens` must be `0`.

Never withdraw-all by passing the `underlyingBalance` to `POST /vault/{address}/withdraw`: the share price moves between
read and execution and floor division leaves dust. Burning the share count exits completely.

### Read a position (earn balance)

`GET /vault/{address}/balance?from=G...` → `{ "dfTokens": <shares>, "underlyingBalance": [<per asset>] }`.
Show `underlyingBalance` (converted with the asset's decimals) as the user's balance. For deposits,
withdrawals and interest earned over time use `GET /account/{walletAddress}/vault/{vaultAddress}`.

### Submit

`POST /send?network=...` with `{ "xdr": "<signed XDR>" }` → `{ txHash, success, result, ledger, createdAt, feeBump, feeCharged }`.
`result.type` is e.g. `vault_deposit` or `vault_withdraw`. You may submit through your own Soroban RPC instead.

## Build responses

Every build endpoint returns:

```json
{ "xdr": "AAAA...", "simulationResponse": "...", "functionName": "deposit", "operationXDR": "AAAA...", "isSmartWallet": false }
```

- `xdr` is a simulated, assembled transaction with `caller` as source: sign it as is, do not re-simulate.
- `simulationResponse` is the contract's simulated return value.
- **Smart wallets (`C...` caller):** `xdr` is `null` and `isSmartWallet` is `true`. Wrap `operationXDR`
  in your own transaction (your wallet SDK or relayer builds and signs it). See the
  [Crossmint guide](https://docs.defindex.io/integration-guide/guides-and-tutorials/crossmint-smart-wallets.md).

## Units, shares and decimals

- Amounts are integers in the asset's smallest unit, sent as **JSON numbers** (the DTOs are `number[]`).
  Keep them as `bigint` in your code and convert with `Number(x)` only at the edge; values above
  2^53 lose precision.
- Read decimals from the asset contract (`decimals()`), do not hardcode. Mainnet assets you will meet:

| Asset | Mainnet contract | Decimals |
|---|---|---|
| XLM | `CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA` | 7 |
| USDC | `CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75` | 7 |
| EURC | `CDTKPWPLOURQA2SGTKTUQOWRCBZEORB4BWBOMJ3D3ZTQQSGE5F6JBQLV` | 7 |

  `100 USDC → 1000000000`. `slippageBps` is basis points: `50` = 0.5%. Its default is `0`.
- **Shares are not the asset.** `dfTokens` is a share count; `underlyingBalance` is what those shares are
  worth now. The share price rises as the vault earns, so a user's `underlyingBalance` grows while
  `dfTokens` stays the same, and the balance is not equal to what was deposited.
- **Multi-asset vaults** take one amount per asset, in `assets[]` order. A wrong length fails with
  contract error 112 `WrongAmountsLength`.
- **APY is a percentage and already net of fees** (`5.93` means 5.93%). `/vault/{address}/apy` is the 7-day APY.
- **First deposit stays idle**: `invest: true` follows the allocation already invested. On a vault that
  has never invested, deposits stay idle until a manager runs one `Invest` rebalance
  (`defindex-vault-admin`).

## Stellar gotchas

- **Testnet**: same API with `?network=testnet`; strategies use Blend testnet tokens (BlendUSDC, not Circle
  USDC). `GET /vault/discover?network=testnet` currently returns mainnet addresses with no funds, so take
  testnet vaults from [testnet.contracts.json](https://github.com/defindex-io/stellar-contracts/blob/main/public/testnet.contracts.json)
  (`xlm_paltalabs_vault` `CCLV4H7WTLJQ7ATLHBBQV2WW3OINF3FOY5XZ7VPHZO7NH3D2ZS4GFSF6`).
- **Unfunded account**: building for an address that does not exist returns `404 Account not found: G...`.
  On testnet fund it with Friendbot.
- **Trustline**: withdrawing a classic asset (USDC, EURC) to an account without a trustline fails
  (token error 13 `MissingTrustline`). Add the trustline first.
- **XLM reserve and fees**: the signer pays the network fee in XLM; keep a small XLM balance.
- **Stale XDR**: built XDRs carry no time bound but are tied to the account's sequence number and to
  the simulated ledger state. If submission fails with `tx_bad_seq` or the state moved, build again.
  Never edit and resubmit an old XDR.
- **Fee-bump / sponsored transactions** are supported by `/send`; see
  [Sponsored transactions](https://docs.defindex.io/integration-guide/guides-and-tutorials/sponsored-transactions.md).
- **Server wallets (Privy, Crossmint)**: the API never needs a secret key. Your signer signs `xdr`
  ([Privy guide](https://docs.defindex.io/integration-guide/guides-and-tutorials/privy-server-wallets.md)).

## Errors

Error bodies are JSON. Contract failures during simulation come back as
`400 { "message": "VaultErrors.<Name>", "errorCode": <n>, "error": "Simulation Failed" }`
(token contract errors read `TokenErrors.<Name>`). Branch on `errorCode`, not on the text.

| Status / code | Meaning | Retryable | Action |
|---|---|---|---|
| `403 Forbidden resource` | Missing, revoked or replaced API key | No | Send `Authorization: Bearer sk_...` with the current key from the Console |
| `403` on an admin or Stable APY route | Key lacks the feature, or `caller` lacks the vault role | No | Use the right caller; ask DeFindex to enable the feature |
| `400` validation (`message` array) | Bad address, empty `amounts`, slippage out of range | No | Fix the request |
| `400 errorCode 112` `WrongAmountsLength` | `amounts` length ≠ vault assets | No | Read `GET /vault/{address}` and send one amount per asset |
| `400 errorCode 111` / `10` `InsufficientBalance` | Caller lacks the asset or the shares | No | Check balances; lower the amount |
| `400 errorCode 13` `MissingTrustline` | Receiving account has no trustline for the asset | No | Add the trustline, then build again |
| `400 errorCode 160` `InsufficientOutputAmount` | Output below the slippage floor | Yes, once | Read the vault again, build again, or raise `slippageBps` within your guardrail |
| `400 errorCode 141` / `144` `StrategyPaused…` | A strategy is paused | No | Wait for the manager; surface it to the user |
| `400 errorCode 130` `Unauthorized` | `caller` lacks the role | No | Admin calls need the role holder as caller |
| `404 Account not found` | `caller` is not a funded account on that network | No | Fund the account; check `network` |
| `404` | Vault not found on that network | No | Check the address and `network` |
| `429 Rate limit exceeded` | Over your tier's bucket | Yes | Wait `retryAfter` seconds from the body, then back off exponentially |
| `500` / `503` | API or upstream (RPC, indexer) failure | Yes | Retry with backoff; reads are safe to retry, builds are rebuilt |
| `/send` `success: false` or `tx_bad_seq` | Submission rejected | Yes, after rebuilding | Build a fresh XDR, sign, submit once |

Full contract error tables (vault 100–202, strategy 400s, Blend 451–455) are in
[Troubleshooting](https://docs.defindex.io/integration-guide/troubleshooting.md).

## Rate limits

Token bucket per API key (per IP without a key). Every response carries `x-ratelimit-limit`,
`x-ratelimit-remaining` and `x-ratelimit-reset` (seconds). Tiers: Free 5 burst / 1 req/s, Starter
20 / 10, Professional 100 / 50, Business 200 / 100. A `429` body carries `retryAfter` in seconds.

## Production hardening

1. **Key on the server.** The key carries your account's permissions; never ship it to a browser.
2. **Timeouts**: 10 s for reads, 30 s for builds (they simulate on chain), 60 s for `/send`, plus a total budget.
3. **Retries** only on `429`, `5xx` and network errors, with exponential backoff and jitter. Never retry a `400` unchanged.
4. **Do not double-submit.** `/send` is not documented as idempotent. On a timeout, look the hash
   up on chain (the hash of the signed XDR) before submitting again.
5. **Validate inputs** before calling: `G...`/`C...` StrKeys, positive integer amounts, one amount per vault asset.
6. **Slippage guardrail** from config, never from user input alone.
7. **Reconcile** after every write: read the balance before and after; `dfTokens` must rise on deposit
   and reach `0` after a full withdraw-shares; the received asset should match the requested amount
   within `slippageBps`. Alert on mismatch.
8. **Observability**: log `x-correlation-id` (sent on every response), endpoint, network, latency,
   status, `errorCode` and `txHash`.
9. **Read before build**: always `GET /vault/{address}` first; cache it for at most a minute.
10. **Freshness**: re-read the docs below when a response differs from this file.

## TypeScript quickstart

```typescript
const API = 'https://api.defindex.io'
const KEY = process.env.DEFINDEX_API_KEY
if (!KEY) throw new Error('Missing DEFINDEX_API_KEY (get one at https://console.defindex.io)')

async function dfx<T>(method: 'GET' | 'POST', path: string, network: 'mainnet' | 'testnet', body?: unknown): Promise<T> {
  const sep = path.includes('?') ? '&' : '?'
  const res = await fetch(`${API}${path}${sep}network=${network}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(method === 'GET' ? 10_000 : 30_000),
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : {}
  if (!res.ok) throw { status: res.status, correlationId: res.headers.get('x-correlation-id'), ...json }
  return json as T
}

// Deposit 10 USDC, then read the position.
const vault = await dfx<any>('GET', `/vault/${VAULT}`, 'mainnet')
const { xdr } = await dfx<{ xdr: string }>('POST', `/vault/${VAULT}/deposit`, 'mainnet', {
  amounts: [100_000_000], caller: USER, invest: true, slippageBps: 50,
})
const signed = await signWithYourWallet(xdr) // Freighter, Privy, Crossmint, a Keypair on a server
const sent = await dfx<{ txHash: string; success: boolean }>('POST', '/send', 'mainnet', { xdr: signed })
const position = await dfx<{ dfTokens: number; underlyingBalance: number[] }>('GET', `/vault/${VAULT}/balance?from=${USER}`, 'mainnet')
```

Runnable versions, with `@defindex/sdk` and with plain `fetch`, are in the repository's `examples/`.

## Trading MCP

`https://api.defindex.io/mcp` exposes the same flows as tools (`vault_discover`, `vault_get`,
`vault_get_apy`, `account_get_position`, `vault_build_deposit`, `vault_build_withdraw`,
`vault_build_withdraw_shares`, `tx_submit`, …). It passes your `Authorization` header through, never
stores it and never signs. Prefer it when you are an agent acting for a user rather than writing code.

## Fresh Context Policy

The docs are the source of truth; this file is a summary.

1. Resolve the intent with the Intent Router.
2. Before writing code, fetch the page for that flow (`.md` versions are small):
   [Quickstart](https://docs.defindex.io/integration-guide/quickstart.md) ·
   [Deposit](https://docs.defindex.io/api-reference/vaults/deposit.md) ·
   [Withdraw](https://docs.defindex.io/api-reference/vaults/withdraw.md) ·
   [Withdraw shares](https://docs.defindex.io/api-reference/vaults/withdraw-shares.md) ·
   [Balance](https://docs.defindex.io/api-reference/vaults/balance.md) ·
   [Vault info](https://docs.defindex.io/api-reference/vaults/vault-info.md) ·
   [Send](https://docs.defindex.io/api-reference/transactions/send.md) ·
   [Troubleshooting](https://docs.defindex.io/integration-guide/troubleshooting.md) ·
   [Sandbox (testnet)](https://docs.defindex.io/integration-guide/sandbox.md) ·
   [Fees](https://docs.defindex.io/intro/fees.md)
3. For exact fields, read the OpenAPI at `https://api.defindex.io/api-json`, or the index at
   `https://docs.defindex.io/llms.txt`. The docs MCP (`https://docs.defindex.io/mcp`) searches all of it.
4. If fetched docs conflict with this file, follow the docs and say so.
5. If the docs cannot be fetched, say the guidance is unverified and continue with this file.
6. Invariants: amounts are smallest-unit integers; read the vault before building; the API never signs.
