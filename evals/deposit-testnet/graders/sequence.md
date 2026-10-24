---
type: llm
focus: trace
---
PASS if the agent read the vault (GET /vault/{address}) before building, sent the amount as an
integer in stroops (100000000 for 10 XLM) inside an `amounts` array, signed the returned XDR with the
Friendbot keypair, submitted it with POST /send (or its own testnet RPC) with network=testnet, got a
successful transaction hash, and then read GET /vault/{address}/balance and reported dfTokens and the
underlying balance.
FAIL if it used mainnet, invented an endpoint, sent the amount as a decimal, or reported success
without a transaction hash.
