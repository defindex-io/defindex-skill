# CLAUDE.md

Agent skills for the DeFindex API, packaged as a Claude Code and Codex plugin. No application code:
`skills/` is the product, `examples/` proves it runs, `evals/` measures it, `scripts/` keeps it honest.

## Layout

- `skills/<name>/SKILL.md`: Agent Skills format (`name`, `description`, `license`, `metadata`). One
  skill per product surface. Long tables go in `skills/<name>/references/`.
- `.claude-plugin/` (Claude Code), `.codex-plugin/` and `.agents/plugins/` (Codex), `.mcp.json`
  (docs MCP and trading MCP). The repository root is the plugin; skills are not copied anywhere.
- `examples/`: TypeScript, `npm run typecheck` in CI. Testnet scripts may submit with a Friendbot key;
  nothing here ever submits on mainnet.
- `evals/`: `claude plugin eval` cases. `evals/run.sh` is the entry point.

## Rules

1. **Document from source.** A behaviour goes into a skill only after it was observed against the
   live API (mainnet reads, unsigned builds, testnet submissions) or read in the `defindex-api` source.
   Authority order: live result > `defindex-api` source > `@defindex/sdk` > docs > issue.
2. **Endpoints are checked.** Write endpoints as `` `GET /vault/{address}/balance` `` or full
   `https://api.defindex.io/...` URLs. `node scripts/check-endpoints.mjs` must pass. A real path that is
   not in the OpenAPI goes in `scripts/endpoint-allowlist.txt` with the reason and the issue that will
   remove it.
3. **No counts that can drift.** Do not write "38 endpoints" or "N MCP tools"; link to the source.
4. **Product wording.** DeFindex is "yield infrastructure for neobanks, fintechs and wallets"; taglines
   never name a chain. Stable APY and Boost are two products; never write "APY Stabilizer". DeFindex
   keeps 50% of the fee (public list price); never publish discounts.
5. **Every skill ends with a Fresh Context Policy** that links the `docs.defindex.io` `.md` pages it
   summarises.
6. **Privileged operations** (admin, factory) say who signs and whether the change can be undone.
7. Bump `version` in the three plugin manifests together.

## Verify before a PR

```bash
node scripts/check-endpoints.mjs
claude plugin validate .
(cd examples && npm ci && npm run typecheck && npm run discover -- --mainnet)
EVAL_TOOLS="WebFetch" evals/run.sh --tag smoke --runs 1 --ablation none --no-publish
```
