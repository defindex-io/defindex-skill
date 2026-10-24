---
type: llm
---
PASS if the answer says `amounts` carries one integer per vault asset, in the order of the vault's
`assets[]` from GET /vault/{address}, in each asset's smallest unit, plus `caller`, and optionally
`invest` and `slippageBps`; and it shows a JSON body with a two-element `amounts` array.
FAIL if it uses decimal amounts, a single amount, or field names that are not in the API.
