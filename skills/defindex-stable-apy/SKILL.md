---
name: defindex-stable-apy
description: Put a DeFindex vault on Stable APY - publish a target rate and let DeFindex move the vault fee inside bounds you set so depositors receive the target and the yield above it becomes fee revenue. Covers status, register, change target, change fee bounds and exit. Use when a wallet or fintech wants one advertised rate instead of a floating APY. For funding yield when the vault runs below target, use defindex-boost.
license: MIT
metadata:
  author: defindex-io
  version: "1.0.0"
---

# DeFindex Stable APY

Stable APY and Boost are **two separate products**. Stable APY moves the vault **fee** so the
rate depositors receive tracks a target; it can only give back yield the strategies produced.
Boost adds **money you fund**. This skill is Stable APY; for Boost use `defindex-boost`.

**Availability**: mainnet only, enabled per account. Every route returns `403 Forbidden` until
DeFindex enables the feature for your API key (ask on [Discord](https://discord.gg/aV5jHwmsaj)).

> **These routes are real but not in the public OpenAPI.** They are served by the API and documented in
> [Stable APY endpoints](https://docs.defindex.io/integration-guide/stable-apy.md), but excluded from
> `https://api.defindex.io/api-json` (the controller is hidden from Swagger). Fetch that page before you
> build, and treat it as the reference.

## How it works

- You set `targetApyBps` and a fee range `minFeeBps`..`maxFeeBps`. DeFindex moves the vault fee inside
  that range, gradually and capped per step; the range is enforced by the contract.
- **Yield above target**: the fee rises and the surplus becomes fee revenue, split with DeFindex like
  any vault fee (DeFindex keeps 50%, public list price).
- **Yield below target**: the fee falls step by step toward `minFeeBps`. At a floor of zero depositors
  get all organic yield. Closing a remaining gap needs Boost.
- Only the stabilizer admin (you) can change the target, the bounds, upgrade the vault, or exit. The
  fee-proxy contract that holds the Manager role cannot be upgraded by anyone.
- Depositors' funds never leave the vault and withdrawals are never frozen.

## Routes

All under `https://api.defindex.io/stabilizer/{vaultAddress}`, with `?network=mainnet` and
`Authorization: Bearer sk_...`. Every write returns
`{ xdr, simulationResponse, functionName, operationXDR, isSmartWallet }` for the `caller` in the
body: sign `xdr` and submit with `POST /send` (for a `C...` caller, wrap `operationXDR` yourself).
All rates are basis points: `800` = 8%.

| Action | Route | Body | Signer |
|---|---|---|---|
| Read state | `GET /stabilizer/{vaultAddress}/status` | — | read only |
| Register | `POST /stabilizer/{vaultAddress}/register` | `{ "caller", "targetApyBps", "minFeeBps", "maxFeeBps" }` | the vault's **current Manager**, who becomes the stabilizer admin |
| Change target | `POST /stabilizer/{vaultAddress}/target-apy` | `{ "caller", "targetApyBps" }` | stabilizer admin |
| Change fee bounds | `POST /stabilizer/{vaultAddress}/fee-bounds` | `{ "caller", "minFeeBps", "maxFeeBps" }` | stabilizer admin |
| Exit | `POST /stabilizer/{vaultAddress}/exit` | `{ "caller" }` | stabilizer admin; the Manager role returns to them |

`status` returns `registered`, `managedByStabilizer`, `config { adminAddress, targetApyBps, minFeeBps, maxFeeBps }`
(or `null`), `campaign` (Boost, or `null`) and `currentFeeBps`.

> **Register hands the vault's Manager role to the fee proxy** in the same transaction. Say so to the
> user before they sign. While registered, manager-gated admin calls go through the proxy and need the
> stabilizer admin as `caller` (see `defindex-vault-admin`). Exit is the only way back.

## Flow

1. `GET /vault/{address}` → confirm network is mainnet and read `roles.manager`.
2. `GET /stabilizer/{vaultAddress}/status` → `registered: false`.
3. Agree target and bounds with the user (`minFeeBps <= maxFeeBps`, fee at most 9000 bps).
4. `POST /stabilizer/{vaultAddress}/register` with the Manager as `caller` → sign → `POST /send`.
5. `GET /stabilizer/{vaultAddress}/status` → `registered: true`, `managedByStabilizer: true`.

## Errors

| Status / code | When | Retryable | Action |
|---|---|---|---|
| `403` | Feature not enabled for the key, or `caller` is not the Manager (register) / stabilizer admin | No | Ask DeFindex to enable it; use the right caller |
| `400` | Not available on that network, `minFeeBps > maxFeeBps` | No | Mainnet only; fix the bounds |
| `404` | Vault not registered | No | Register first |
| 3000 `FeeProxyErrors.UNAUTHORIZED` | Wrong signer | No | Sign with the stabilizer admin |
| 3010 / 3011 | Already registered / not registered | No | Read `status` first |
| 3020 / 3021 | Fee out of bounds / invalid bounds | No | Keep the fee and bounds consistent |

## Wording

Call the product **Stable APY**. It is not a guarantee: below target, only Boost funds the gap.

## Fresh Context Policy

Fetch [Stable APY](https://docs.defindex.io/products/stable-apy.md) and
[Stable APY endpoints](https://docs.defindex.io/integration-guide/stable-apy.md) before acting. They win
over this file. Because these routes are not in the OpenAPI, the repository's drift check allowlists
them; if the docs page no longer lists a route, do not call it.
