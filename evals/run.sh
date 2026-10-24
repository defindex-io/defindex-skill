#!/usr/bin/env bash
# Runs the eval suite with `claude plugin eval` in fresh sessions that have only this plugin's skills
# and the DeFindex docs MCP. The trading MCP in .mcp.json is started but its tools are not granted,
# so the agent cannot use it.
#
#   DEFINDEX_API_KEY=sk_... evals/run.sh                 # every case
#   evals/run.sh --tag keyless                           # cases that need no API key
#   evals/run.sh --case deposit-testnet --runs 3         # extra flags go to `claude plugin eval`
#
# Cost: each case is one full Claude Code session per run (and a second, no-plugin baseline arm
# unless you pass --ablation none). Start with --tag smoke.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Only EVAL_* variables reach the agent. Keep the key in your shell, never in a case file.
if [[ -n "${DEFINDEX_API_KEY:-}" ]]; then
  export EVAL_DEFINDEX_API_KEY="${DEFINDEX_API_KEY}"
else
  echo "DEFINDEX_API_KEY is not set: cases tagged needs-key will fail. Use --tag keyless to skip them." >&2
fi

# Cases that call the API need a shell. `claude plugin eval` runs Bash only inside its OS sandbox
# (bubblewrap and socat on Linux, built in on macOS) and refuses the run without it. Docs-only cases
# can drop the shell: EVAL_TOOLS="WebFetch" evals/run.sh --tag keyless
read -r -a TOOLS <<< "${EVAL_TOOLS:-Bash Write Edit WebFetch}"

exec claude plugin eval "${ROOT}" \
  --mocks off \
  --allow-tools 'mcp__plugin_defindex_defindex-docs__*' "${TOOLS[@]}" \
  --trust-plugin \
  "$@"
