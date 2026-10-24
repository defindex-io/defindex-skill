---
name: defindex-vault-admin
description: Administer a DeFindex vault through the API - read and change roles, rebalance strategies, lock, release and distribute fees, rescue funds from a strategy, pause or unpause a strategy, upgrade the vault WASM. Every operation is privileged and some are irreversible; use only when the user holds the vault role and explicitly asks for an admin change.
license: MIT
metadata:
  author: defindex-io
  version: "1.0.0"
---

# DeFindex Vault Administration

Every endpoint here builds an **unsigned** transaction that only a vault role holder can sign. The
API never signs. Base URL `https://api.defindex.io`, `?network=mainnet|testnet` on every call,
`Authorization: Bearer sk_...` from [console.defindex.io](https://console.defindex.io).

> **Before any write:** state in plain words what will change, on which vault and network, which
> role must sign, and whether it can be undone. Get an explicit yes from the user. Build on testnet
> first when you can. Never sign for the user.

## Use / Do not use

Use when the user manages a vault they hold a role on: roles, rebalance, fees, rescue, pause,
upgrade. For deposits and withdrawals use `integrating-defindex`; to deploy a vault use
`defindex-create-vault`; for a target rate use `defindex-stable-apy`.

## Roles

`GET /vault/{address}/get/{role}` reads one; `GET /vault/{address}` returns all four under `roles`.

| Role (`{role}` value) | Can do |
|---|---|
| `manager` | Every action below, including those of the other roles. The only role that locks or releases fees, changes the fee rate, upgrades, and sets `manager`, `emergency-manager` and `rebalance-manager` |
| `emergency-manager` | `rescue`, `pause-strategy`, `unpause-strategy` |
| `rebalance-manager` | `rebalance` |
| `fee-receiver` | Receives the vault's share of fees; can call `distribute-fees` and set `fee-receiver`. Needs a trustline for every vault asset or distributions fail |

No role can withdraw depositors' funds, and no role can block their withdrawals.

## Operations

| Operation | Endpoint | Body | Signer | Reversible? |
|---|---|---|---|---|
| Set a role | `POST /vault/{address}/set/{role}` | `{ "new_address", "caller" }` | `manager` (the current `fee-receiver` may also set `fee-receiver`) | Only by the new holder. **Setting `manager` to an address you do not control loses the vault for good.** |
| Rebalance | `POST /vault/{address}/rebalance` | `{ "caller", "instructions": [...] }` | `manager` or `rebalance-manager` | Yes, by another rebalance; swaps pay slippage and pool fees |
| Lock fees (and optionally set the fee rate) | `POST /vault/{address}/lock-fees` | `{ "caller", "new_fee_bps"? }` | `manager` | Rate: yes, set it again. Locking also happens on every deposit and withdraw; this triggers it by hand |
| Release locked fees | `POST /vault/{address}/release-fees` | `{ "caller", "strategy_address", "amount" }` | `manager` | Returns locked fees to the strategy |
| Distribute fees | `POST /vault/{address}/distribute-fees` | `{ "caller" }` | `manager` or `fee-receiver` | **No.** Pays the locked fees out to the fee receiver and DeFindex |
| Rescue | `POST /vault/{address}/rescue` | `{ "strategy_address", "caller" }` | `manager` or `emergency-manager` | **Not in one step.** Unwinds the whole strategy to idle and pauses it; restoring takes an unpause plus an `Invest` rebalance |
| Pause a strategy | `POST /vault/{address}/pause-strategy` | `{ "strategy_address", "caller" }` | `manager` or `emergency-manager` | Yes, with unpause |
| Unpause a strategy | `POST /vault/{address}/unpause-strategy` | `{ "strategy_address", "caller" }` | `manager` or `emergency-manager` | Yes, with pause |
| Upgrade the WASM | `POST /vault/{address}/upgrade` | `{ "new_wasm_hash", "caller" }` | `manager` | **No** in practice: new code runs against every depositor's funds. Only on `upgradable` vaults |
| Strategy report | `GET /vault/{address}/report` | — | any signer | Builds a `report` transaction that updates strategy accounting |
| Fee status | `GET /vault/{address}/fees/status` | — | read only | — |

Each build returns `{ xdr, simulationResponse, functionName, operationXDR, isSmartWallet }`. Sign
`xdr` with the role holder and submit with `POST /send` or your own RPC.

### Rebalance instructions

```json
{
  "caller": "G...",
  "instructions": [
    { "type": "Unwind", "strategy_address": "C...", "amount": 300000 },
    { "type": "Invest", "strategy_address": "C...", "amount": 500000 },
    { "type": "SwapExactIn", "token_in": "C...", "token_out": "C...", "amount": 100000, "slippageToleranceBps": 50 }
  ]
}
```

Types: `Invest` (idle → strategy), `Unwind` (strategy → idle), `SwapExactIn`, `SwapExactOut`
(swaps route through Soroswap). Instructions run in order in one transaction. Unwinding more than a
strategy holds fails with 128 `UnwindMoreThanAvailable`.

A new vault's first deposits stay idle until one `Invest` rebalance runs; after that, deposits with
`invest: true` follow the allocation.

### Fees

- `vaultFee` (`feesBps.vaultFee` on `GET /vault/{address}`) is a performance fee on yield, in bps,
  set with `lock-fees` `new_fee_bps`. The contract caps it at 9000 bps (90%).
- DeFindex keeps 50% of the fee you set (public list price) and the fee receiver keeps the rest.
  `feesBps.defindexFee` is DeFindex's share, in bps of the fee. Read it from the vault, do not hardcode it.
- `GET /vault/{address}/fees/status` returns locked fees, pending gains and how a distribution would split.
- The APY the API reports is already net of fees.

## Stable APY vaults

If `GET /vault/{address}` shows `managedByStabilizer: true`, the vault's Manager role is held by the
Stable APY fee proxy. The API then routes manager-gated calls (roles, fees, upgrade, rescue, pause)
through the proxy automatically and adds `viaProxy: true` to the response. The `caller` must be the
vault's stabilizer admin, not the old manager. See `defindex-stable-apy`.

## Errors

| Code | Name | Retryable | Action |
|---|---|---|---|
| `403` | Key or feature not enabled, or `caller` lacks the role | No | Use the role holder as `caller` |
| 130 | `Unauthorized` | No | The signer does not hold the role this operation needs |
| 131 | `RoleNotFound` | No | `{role}` is one of `manager`, `emergency-manager`, `rebalance-manager`, `fee-receiver` |
| 126 | `NotUpgradable` | No | The vault was deployed non-upgradable |
| 128 | `UnwindMoreThanAvailable` | No | Read `totalManagedFunds` and lower the amount |
| 129 | `InsufficientFeesToRelease` | No | Check `fees/status` |
| 140 / 141 | `StrategyNotFound` / `StrategyPausedOrNotFound` | No | Use a strategy listed under the vault's `assets[].strategies` |
| 162 | `InvalidFeeBps` | No | 0 to 9000 bps |
| 3000–3021 | `FeeProxyErrors.*` | No | Stable APY vault: sign with the stabilizer admin; keep the fee inside its bounds |

Full tables: [Troubleshooting](https://docs.defindex.io/integration-guide/troubleshooting.md).

## Fresh Context Policy

Fetch before acting, and prefer the docs when they disagree with this file:
[Vault roles](https://docs.defindex.io/integration-guide/vault-roles.md) ·
[Vault administration](https://docs.defindex.io/advanced-documentation/direct-contract-calls/vault-administration.md) ·
[Rebalance](https://docs.defindex.io/api-reference/vault-management/rebalance.md) ·
[Set role](https://docs.defindex.io/api-reference/vault-management/set-role.md) ·
[Lock fees](https://docs.defindex.io/api-reference/vault-management/lock-fees.md) ·
[Rescue](https://docs.defindex.io/api-reference/vault-management/rescue.md) ·
[Upgrade](https://docs.defindex.io/api-reference/vault-management/upgrade.md) ·
[Fees](https://docs.defindex.io/intro/fees.md).
Exact fields: `https://api.defindex.io/api-json`. On the trading MCP these builds are only exposed
with `https://api.defindex.io/mcp?toolset=admin`.
