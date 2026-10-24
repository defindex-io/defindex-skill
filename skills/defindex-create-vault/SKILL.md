---
name: defindex-create-vault
description: Deploy a new DeFindex vault through the factory with the API - create-vault, create-vault-deposit (create and fund in one transaction) and create-vault-auto-invest (create, fund, invest and hand over the manager role). Use when a wallet or fintech launches its own vault with chosen assets, strategies, roles and fee.
license: MIT
metadata:
  author: defindex-io
  version: "1.0.0"
---

# Create a DeFindex Vault

A vault is deployed by the DeFindex factory. The API builds the **unsigned** factory call; `caller`
signs it and submits it with `POST /send`. Base URL `https://api.defindex.io`,
`?network=mainnet|testnet` on every call, `Authorization: Bearer sk_...` from
[console.defindex.io](https://console.defindex.io). The Console can also create vaults without code.

> **Before building:** confirm the four role addresses, the fee, the assets and strategies, and
> whether the vault is upgradable. Roles and fee can change later; **`upgradable: false` and the
> asset list are permanent**, and setting `manager` to an address nobody controls loses the vault.
> Try it on testnet first.

## Use / Do not use

Use to deploy a vault. For deposits into an existing vault use `integrating-defindex`; to change
an existing vault use `defindex-vault-admin`.

## Choose the endpoint

| Endpoint | What it does | When |
|---|---|---|
| `POST /factory/create-vault` | Deploys the vault only | You will fund and invest later |
| `POST /factory/create-vault-deposit` | Deploys and makes the first deposit atomically | Recommended for most launches |
| `POST /factory/create-vault-auto-invest` | Deploys, deposits, runs the first `Invest` rebalance across the strategies, then sets the final manager, in one transaction | The vault should earn from the first block |

`GET /factory/address` returns the factory contract for a network (needs a key).

## Requirements

- **Four roles**, all required: `manager`, `emergencyManager`, `rebalanceManager`, `feeReceiver`.
  The `caller` that deploys does not need to hold any of them. Use a multisig or policy contract for
  `manager`; the fee receiver needs a trustline for every vault asset.
- **Fee**: `vaultFeeBps` (`vaultFee` on auto-invest) in basis points of yield, 0 to 9000. Above
  9000 the contract rejects it (106 `MaximumFeeExceeded`). DeFindex keeps 50% of the fee you set
  (public list price).
- **Strategies** must support the asset they are listed under (102 `StrategyDoesNotSupportAsset`).
  Take addresses from `GET /strategies` or
  [Contract deployments](https://docs.defindex.io/contract-deployments/index.md); never invent one.
- **First deposit of at least 1001 units** of the smallest denomination. The vault locks 1000 shares on
  the first deposit as an inflation-attack defence.
- **Testnet tokens**: testnet strategies run on Blend testnet pools and use BlendUSDC, not Circle USDC.
  See the [Sandbox](https://docs.defindex.io/integration-guide/sandbox.md).

## Bodies

`create-vault`:

```json
{
  "roles": { "manager": "G...", "emergencyManager": "G...", "rebalanceManager": "G...", "feeReceiver": "G..." },
  "vaultFeeBps": 1000,
  "assets": [ { "address": "C...", "strategies": [ { "address": "C...", "name": "usdc_blend", "paused": false } ] } ],
  "name": "My USDC Vault",
  "symbol": "MUSDC",
  "upgradable": true,
  "caller": "G..."
}
```

`create-vault-deposit`: the same plus `"depositAmounts": [<int per asset>]`.

`create-vault-auto-invest`:

```json
{
  "caller": "G...",
  "roles": { "manager": "G...", "emergencyManager": "G...", "rebalanceManager": "G...", "feeReceiver": "G..." },
  "name": "My Auto-Invest Vault",
  "symbol": "MAIV",
  "vaultFee": 1000,
  "upgradable": true,
  "assets": [
    { "address": "C...", "symbol": "USDC", "amount": 200000000,
      "strategies": [ { "address": "C...", "name": "usdc_blend", "amount": 200000000 } ] }
  ]
}
```

Each asset's `amount` is the total deposit; the strategies' `amount`s are the allocation and must add
up to it. 1 to 10 assets, 1 to 10 strategies per asset. `caller` deposits and is the manager during
the transaction; the role passes to `roles.manager` at the end. The `201` response adds
`predictedVaultAddress` and a `warning`: the address comes from simulation and can differ if network
state changes, so read the real address from the `/send` result or the factory event.

Amounts are integers in the asset's smallest unit (7 decimals for XLM, USDC, EURC).

## After deployment

1. Submit the signed XDR with `POST /send` and keep `txHash`.
2. If you used `create-vault` or `create-vault-deposit`, deposits stay **idle** until the manager or
   rebalance manager runs one `Invest` rebalance (`defindex-vault-admin`). After that, deposits with
   `invest: true` follow the allocation.
3. Read the vault back with `GET /vault/{address}` and check roles, fee and assets.

## Errors

| Code | Name | Retryable | Action |
|---|---|---|---|
| 101 | `InvalidRatio` | No | Fix the allocation amounts |
| 102 | `StrategyDoesNotSupportAsset` | No | Use a strategy built for that asset |
| 104 / 105 | `RolesIncomplete` / `MetadataIncomplete` | No | All four roles, `name` and `symbol` |
| 106 | `MaximumFeeExceeded` | No | Fee at most 9000 bps |
| 107 / 108 | `DuplicatedAsset` / `DuplicatedStrategy` | No | Remove duplicates |
| 404 (factory) | `AssetLengthMismatch` | No | One deposit amount per asset |
| HTTP `404` | Factory or account not found on that network | No | Check `network`; fund `caller` |
| HTTP `500` on auto-invest | Batched simulation failed | Yes, once | Re-read strategy addresses and amounts, build again |

## Fresh Context Policy

Fetch before building and prefer the docs over this file:
[Create a vault](https://docs.defindex.io/integration-guide/creating-a-defindex-vault/index.md) ·
[Using the API](https://docs.defindex.io/integration-guide/creating-a-defindex-vault/using-the-api.md) ·
[create-vault](https://docs.defindex.io/api-reference/factory/create-vault.md) ·
[create-vault-deposit](https://docs.defindex.io/api-reference/factory/create-vault-deposit.md) ·
[create-vault-auto-invest](https://docs.defindex.io/api-reference/factory/create-vault-auto-invest.md) ·
[Vault roles](https://docs.defindex.io/integration-guide/vault-roles.md).
Exact fields: `https://api.defindex.io/api-json`. On the trading MCP the factory build is in the
admin toolset (`https://api.defindex.io/mcp?toolset=admin`).
