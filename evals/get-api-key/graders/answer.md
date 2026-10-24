---
type: llm
---
PASS if the answer says the key is generated in the DeFindex Console (console.defindex.io), is sent as
`Authorization: Bearer sk_...`, that generating a new key revokes the old one or that one key is
active at a time, and names GET /vault/discover (and optionally /health, /strategies) as working
without a key.
FAIL if it tells the user to register or log in on api.defindex.io to get the key.
