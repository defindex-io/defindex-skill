# Defindex API — Claude Code Skill

A Claude Code skill that gives the model a complete, structured reference for the [DeFindex REST API](https://api.defindex.io). Install it and Claude Code will know how to authenticate, call every endpoint, handle errors, and generate working code — without you having to paste docs.

## What it covers

- **Authentication** — register, login, generate API key, refresh tokens
- **User operations** — deposit, withdraw, withdraw-shares, balance, APY, discover vaults
- **Vault administration** — roles (get/set), rebalance, lock/release/distribute fees, rescue, pause/unpause strategies, upgrade WASM
- **Factory** — create-vault, create-vault-deposit, create-vault-auto-invest
- **Submit transactions** — POST `/send` for signed XDRs
- **Rate limits** — tier configs and retry patterns

## Installation

Copy the skill files to your Claude Code skills directory:

```bash
mkdir -p ~/.claude/skills/defindex-api
curl -sL https://raw.githubusercontent.com/defindex-io/defindex-skill/main/SKILL.md -o ~/.claude/skills/defindex-api/SKILL.md
curl -sL https://raw.githubusercontent.com/defindex-io/defindex-skill/main/auth.md -o ~/.claude/skills/defindex-api/auth.md
curl -sL https://raw.githubusercontent.com/defindex-io/defindex-skill/main/endpoints.md -o ~/.claude/skills/defindex-api/endpoints.md
```

Or clone the repo directly:

```bash
git clone https://github.com/defindex-io/defindex-skill ~/.claude/skills/defindex-api
```

## Usage

In Claude Code:

```
/defindex-api
```

With a specific topic:

```
/defindex-api deposit
/defindex-api auth
/defindex-api admin
/defindex-api factory
```

Or just describe what you want and Claude will pick up the skill automatically:

```
Help me deposit 100 USDC into the mainnet vault using the defindex API
```

## Argument hints

| Argument | What you get |
|---|---|
| `auth` | Registration, login, API key generation |
| `vault` | Vault info, balance, APY |
| `deposit` | Deposit flow with TypeScript code example |
| `withdraw` | Withdraw and withdraw-shares |
| `admin` | Roles, rebalance, fees, rescue, pause, upgrade |
| `factory` | Create vault, create-vault-deposit, auto-invest |
| `send` | Submit signed XDR |
| `rate-limits` | Tier configs, 429 handling |

## Files

| File | Contents |
|---|---|
| `SKILL.md` | Entry point — routing, rate limits, XDR flow overview |
| `auth.md` | Register, login, API key generation, refresh, revoke |
| `endpoints.md` | All 25+ endpoints with request/response shapes and TypeScript examples |

## Prerequisites

You need a DeFindex API key:

1. Register → https://api.defindex.io/register
2. Login → https://api.defindex.io/login
3. Generate a key from the dashboard

## Related

- [DeFindex Documentation](https://docs.defindex.io)
- [Full API Reference](https://api.defindex.io/docs)
- [defindex-bridge skill](https://github.com/paltalabs/defindex) — bridge USDC from Base → Stellar via Sodax
- [Discord](https://discord.gg/e2qAhJCBmx)

## License

MIT
