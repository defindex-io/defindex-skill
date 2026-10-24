---
name: defindex-api
description: Deprecated entry point kept so `/defindex-api` keeps working. Routes to the DeFindex skills that replaced it - integrating-defindex (vaults, deposits, withdrawals, balances), defindex-vault-admin, defindex-create-vault, defindex-stable-apy and defindex-boost.
license: MIT
user-invocable: true
argument-hint: "[task or topic: vault|deposit|withdraw|balance|admin|factory|send|stable-apy|boost|rate-limits]"
metadata:
  author: defindex-io
  version: "2.0.0"
---

# defindex-api (deprecated alias)

This skill used to hold the whole DeFindex API reference. It was split into focused skills. Load the
one that matches the argument and follow it; do not use this file as a reference.

| Argument / need | Skill |
|---|---|
| `vault`, `deposit`, `withdraw`, `balance`, `send`, `rate-limits`, errors | `integrating-defindex` |
| `admin`: roles, rebalance, fees, rescue, pause, upgrade | `defindex-vault-admin` |
| `factory`: create-vault, create-vault-deposit, create-vault-auto-invest | `defindex-create-vault` |
| `stable-apy`: fixed advertised rate | `defindex-stable-apy` |
| `boost`: funded yield campaign | `defindex-boost` |
| `auth` | API keys come from [console.defindex.io](https://console.defindex.io); see `integrating-defindex` |

Two things changed since the old version: keys are created in the Console (not by registering on
`api.defindex.io`), and the old strategies-APY endpoint (`strategies/apy`) is not in the OpenAPI, so it is gone from the skills.
