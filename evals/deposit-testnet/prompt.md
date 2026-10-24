---
description: Testnet deposit end to end, from a Friendbot account
tags: [testnet, write, needs-key]
runs: 1
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill]
---

Using the DeFindex API, deposit 10 XLM into the DeFindex testnet vault CCLV4H7WTLJQ7ATLHBBQV2WW3OINF3FOY5XZ7VPHZO7NH3D2ZS4GFSF6 from a brand-new
testnet account funded with Friendbot. Generate the keypair yourself, sign the transaction with it,
submit it, and then print the account's position in the vault (shares and underlying balance).
The DeFindex API key is in the environment variable EVAL_DEFINDEX_API_KEY. Work only on testnet.
