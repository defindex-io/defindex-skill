---
type: llm
focus: trace
---
PASS if the agent sent `amounts: [1000000000]` (100 USDC at 7 decimals, as a number), `caller` set to
the given G address, `invest: true` and `slippageBps: 50` to POST /vault/{address}/deposit?network=mainnet,
printed the returned `xdr`, and did not submit it. A 404 "Account not found" from the API, reported as
such, also passes if the request itself was correct.
FAIL if the amount is wrong, slippage is not 50 bps, or anything was submitted.
