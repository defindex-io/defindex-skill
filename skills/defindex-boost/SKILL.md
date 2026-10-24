---
name: defindex-boost
description: Fund and read a DeFindex Boost campaign - a budget you fund in the vault's asset that tops the vault up toward a target APY while it runs below target. Use when a wallet or fintech wants to lift a vault's rate for a season with its own money, read how much of a campaign is left, or explain what a boost costs. For a fee-based target rate use defindex-stable-apy.
license: MIT
metadata:
  author: defindex-io
  version: "1.0.0"
---

# DeFindex Boost

Boost and Stable APY are **two separate products**. Stable APY moves the vault fee; it cannot create
yield. **Boost spends a budget you fund** to raise what every depositor holds while the vault sits
below its target. A vault can run a campaign with or without Stable APY.

## How a campaign runs

- DeFindex registers the campaign for a vault (single-asset vaults only). Once it is active, **anyone**
  can add funds to it.
- The budget is held per vault, in the vault's own asset. While the vault is below target and the
  budget has funds, transfers move into the vault, raising the share price for every depositor.
- When the budget runs out, the vault returns to its organic rate. What is left can be sent back to an
  address you name.
- **A boost carries no vault fee**: it is a plain transfer, not strategy gains, so every unit reaches
  depositors and neither you nor DeFindex is paid on it.
- On a Stable APY vault, a fee floor above zero keeps your fee running through the shortfall, so the
  campaign has more ground to cover. Talk to the DeFindex team before planning a campaign you expect to
  earn from.
- Boosts only move money in: nothing here can take funds out of the vault or delay a withdrawal.

## Routes

Mainnet only, enabled per account (`403` until DeFindex enables it). Not in the public OpenAPI; the
reference is [Stable APY endpoints](https://docs.defindex.io/integration-guide/stable-apy.md).

| Action | Route | Body |
|---|---|---|
| Read the campaign | `GET /stabilizer/{vaultAddress}/status` | — |
| Fund the campaign | `POST /stabilizer/{vaultAddress}/boost/deposit` | `{ "caller": "G...", "amount": "1000000000" }` |

Both take `?network=mainnet` and `Authorization: Bearer sk_...`. `amount` is the smallest unit of the
campaign asset, **as a string**. The deposit returns `{ xdr, simulationResponse, functionName, operationXDR, isSmartWallet }`:
`caller` signs `xdr` and you submit it with `POST /send`.

`status.campaign` is `null` without a campaign, otherwise
`{ active, asset, totalDeposited, totalBoosted, totalWithdrawn, available, lastBoostedAt }`
(amounts in stroops of the campaign asset as strings, `lastBoostedAt` in unix seconds, `0` = never).

## Flow

1. `GET /stabilizer/{vaultAddress}/status` → `campaign.active: true`; note `campaign.asset`.
2. Convert the human amount with the asset's decimals (7 for USDC, EURC, XLM).
3. `POST /stabilizer/{vaultAddress}/boost/deposit` → sign with `caller` → `POST /send`.
4. Read `status` again: `totalDeposited` and `available` rise by `amount`.

## Errors

| Status / code | When | Retryable | Action |
|---|---|---|---|
| `403` | Feature not enabled for the key | No | Ask DeFindex to enable it |
| `404` | The vault has no campaign | No | DeFindex registers campaigns; ask the team |
| `400` | Campaign inactive, or `amount` not a positive integer string | No | Check `status`; send `amount` as a string |
| 4011 / 4012 `BoostTreasuryErrors` | Campaign not registered / inactive | No | Same as above |
| 4031 `INSUFFICIENT_BUDGET` | Budget below what was requested | No | Fund the campaign |
| Token error 10 | `caller` lacks the asset | No | Fund `caller` |

## Fresh Context Policy

Fetch [Boost](https://docs.defindex.io/products/boost.md) and
[Stable APY endpoints](https://docs.defindex.io/integration-guide/stable-apy.md) first; they win over
this file. If the docs page no longer lists a route, do not call it.
