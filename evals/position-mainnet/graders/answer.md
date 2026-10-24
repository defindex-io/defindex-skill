---
type: llm
---
PASS if the answer distinguishes vault shares (dfTokens) from the underlying balance, converts the
underlying from stroops with 7 decimals (USDC), and reports both values as returned by the API
(zero is a valid answer if the API returned zero).
FAIL if it treats shares as USDC, or presents numbers that did not come from an API call.
