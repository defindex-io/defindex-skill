---
type: llm
focus: trace
---
PASS if, to exit, the agent read the share balance (dfTokens) and called
POST /vault/{address}/withdraw-shares with `shares` equal to that dfTokens value, submitted it, and
showed that the share balance afterwards is 0.
FAIL if it tried to withdraw everything by passing the underlying balance to POST /vault/{address}/withdraw,
if shares remain, or if it never submitted the withdrawal.
