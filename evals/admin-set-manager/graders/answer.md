---
type: llm
---
PASS if the answer gives POST /vault/{address}/set/manager?network=mainnet with body
`{ "new_address": ..., "caller": <current manager> }`, says the current Manager must sign, warns that
handing the manager role to an address the user does not control is effectively irreversible, and
mentions that a Stable APY vault (managedByStabilizer) routes the call through the fee proxy with the
stabilizer admin as caller, or asks the user to confirm before building.
FAIL if it signs or submits anything, or omits the warning.
