---
type: llm
---
PASS if the answer names Stable APY, says it is mainnet only and enabled per account, that the vault's
current Manager registers it (POST /stabilizer/{vaultAddress}/register) and becomes the stabilizer
admin, that the fee moves inside the bounds the admin sets, and that below target the fee falls toward
the floor and only Boost (a separate, funded product) can close the remaining gap.
FAIL if it presents Stable APY as a guarantee, merges Stable APY and Boost into one product, or calls
it "APY Stabilizer".
