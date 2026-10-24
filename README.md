# DeFindex Agent Skills

Skills that teach AI coding agents (Claude Code, Codex, Cursor and anything that reads the
[Agent Skills](https://agentskills.io) format) to integrate [DeFindex](https://defindex.io), yield
infrastructure for neobanks, fintechs and wallets. With them an agent can find a vault, get a key,
build a deposit, sign it, send it and read the position back on the first try.

The repository is also a Claude Code and Codex plugin that bundles the skills with the DeFindex docs
MCP and trading MCP.

## Skills

| Skill | Use it for |
|---|---|
| [`integrating-defindex`](skills/integrating-defindex/SKILL.md) | The API: discover vaults, read a vault, earn balances, deposit, withdraw, withdraw everything, submit; error table with retry guidance; production hardening |
| [`defindex-vault-admin`](skills/defindex-vault-admin/SKILL.md) | Roles, rebalance, fees, rescue, pause, upgrade, each with who signs and whether it can be undone |
| [`defindex-create-vault`](skills/defindex-create-vault/SKILL.md) | The factory: `create-vault`, `create-vault-deposit`, `create-vault-auto-invest` |
| [`defindex-stable-apy`](skills/defindex-stable-apy/SKILL.md) | Stable APY: publish a target rate, DeFindex moves the fee inside your bounds |
| [`defindex-boost`](skills/defindex-boost/SKILL.md) | Boost: a budget you fund that tops a vault up toward its target |
| [`defindex-api`](skills/defindex-api/SKILL.md) | Deprecated alias of the old single skill, so `/defindex-api` keeps working |

Stable APY and Boost are two separate products and have one skill each.

## Install

### Any agent (Agent Skills)

```bash
npx skills add defindex-io/defindex-skill                                  # every skill
npx skills add defindex-io/defindex-skill --skill "integrating-defindex"   # one skill
```

### Claude Code plugin (skills plus both MCP servers)

```bash
claude plugin marketplace add defindex-io/defindex-skill
claude plugin install defindex@defindex
```

or, inside Claude Code, `/plugin install defindex --marketplace defindex-io/defindex-skill`.

Set `DEFINDEX_API_KEY` in your environment before starting Claude Code so the trading MCP can pass it
through. Get a key at [console.defindex.io](https://console.defindex.io).

### Codex plugin

Open this repository in Codex (it reads `.agents/plugins/marketplace.json`), restart it if it was
open, run `/plugins` and install `defindex` from the DeFindex marketplace. The plugin manifest is
`.codex-plugin/plugin.json`.

### MCP servers only

| Server | URL | Auth |
|---|---|---|
| Docs (search the documentation) | `https://docs.defindex.io/mcp` | none |
| Trading (build unsigned transactions, read vaults and positions) | `https://api.defindex.io/mcp` | `Authorization: Bearer sk_...`, passed through and never stored; the server never signs |

```bash
claude mcp add --transport http defindex-docs https://docs.defindex.io/mcp
claude mcp add --transport http defindex https://api.defindex.io/mcp --header "Authorization: Bearer $DEFINDEX_API_KEY"
```

Admin tools (rebalance, roles, upgrade, factory) are only listed on `https://api.defindex.io/mcp?toolset=admin`.

## Migrating from `defindex-api`

Until this version the repository held one skill, `defindex-api`, with `SKILL.md`, `auth.md` and
`endpoints.md` at the root, installed by copying them into `~/.claude/skills/defindex-api/`.

- **Reinstall** with one of the commands above. The new skills load on their own when the task
  matches; you do not need to invoke them.
- **`/defindex-api` still works**: the `defindex-api` skill is now a short router to the new skills.
- **If you cloned this repository into `~/.claude/skills/defindex-api`**, a `git pull` removes the root
  `SKILL.md` and Claude Code stops seeing the skill. Delete that folder and reinstall.
- **What changed in the content**: API keys come from the [Console](https://console.defindex.io), not
  from registering on `api.defindex.io`; the strategies-APY endpoint the old file documented is not in
  the OpenAPI and was removed; `GET /factory/address` needs a key; Stable APY, Boost, account history and
  vault migration are now covered.

## Examples

[`examples/`](examples/README.md) has runnable TypeScript for the user flows, with `@defindex/sdk` and
with plain `fetch`. On testnet the deposit script runs end to end with a Friendbot account (deposit,
reconcile, withdraw everything). On mainnet the scripts only build unsigned transactions.

## Evals

[`evals/`](evals) holds ten cases in the `claude plugin eval` format, taken from the
prompt-to-sequence table of [defindex-io/docs#19](https://github.com/defindex-io/docs/issues/19):
testnet deposit and full withdrawal, mainnet position, discovery, APY, an unsigned mainnet deposit, API
keys, multi-asset amounts, Stable APY and a privileged admin call. Each case is a `prompt.md` and
`graders/*.md` (`regex` over the trace for the calls made, `tool_used` to forbid submitting, `llm`
for the answer).

```bash
DEFINDEX_API_KEY=sk_... evals/run.sh                       # all cases
EVAL_TOOLS="WebFetch" evals/run.sh --tag keyless           # no key, no shell
evals/run.sh --case deposit-testnet --runs 3 --no-publish
```

`evals/run.sh` runs each case in a fresh Claude Code session with only this plugin's skills and the
docs MCP: the trading MCP's tools are not granted. The key reaches the agent as
`EVAL_DEFINDEX_API_KEY` (only `EVAL_*` variables are passed into a run). Cases that call the API need a
shell, and `claude plugin eval` only grants Bash inside its OS sandbox (on Linux, `bubblewrap` and
`socat`). Run the suite on every API release. Results land in `evals/results/`, which is not committed.

## CI

`.github/workflows/ci.yml` runs on every push and pull request, and daily:

- `node scripts/check-endpoints.mjs` reads every endpoint named in the skills, examples, evals and this
  README and fails if the live [OpenAPI](https://api.defindex.io/api-json) does not have it, or has it
  with another method. Paths that exist but are not in the spec are listed with their reason in
  `scripts/endpoint-allowlist.txt`.
- The plugin and marketplace manifests must parse.
- The examples must typecheck.

## Contributing

Read [CLAUDE.md](CLAUDE.md) (also `AGENTS.md`). In short: behaviour goes into a skill only after it
was checked against the live API or the `defindex-api` source, and the drift check must pass.

## Links

- [Documentation](https://docs.defindex.io) · [llms.txt](https://docs.defindex.io/llms.txt) · [OpenAPI](https://api.defindex.io/api-json)
- [Console](https://console.defindex.io) · [Discord](https://discord.gg/aV5jHwmsaj)

## License

MIT
