---
description: Testnet deposit then full exit with withdraw-shares
tags: [testnet, write, needs-key]
runs: 1
max_turns: 50
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Skill]
---

On Stellar testnet, create a Friendbot-funded account, deposit 5 XLM into the DeFindex vault
CCLV4H7WTLJQ7ATLHBBQV2WW3OINF3FOY5XZ7VPHZO7NH3D2ZS4GFSF6, and then withdraw everything the account holds in that vault so that nothing is left.
Sign with the throwaway key and submit both transactions. Show the share balance before and after the
exit. The DeFindex API key is in the environment variable EVAL_DEFINDEX_API_KEY.
