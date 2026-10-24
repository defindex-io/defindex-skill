---
type: llm
---
PASS if the answer gives the APY from GET /vault/{address}/apy as a percentage, says it is the
7-day APY, and says it is already net of fees.
FAIL if it says the APY is gross, or gives a number without calling the API.
