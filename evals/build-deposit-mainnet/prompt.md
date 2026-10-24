---
description: Build an unsigned mainnet deposit, never submit
tags: [mainnet, build, needs-key]
runs: 1
max_turns: 20
allowed_tools: [Read, Glob, Grep, Skill]
---

Build, but do not sign or submit, a DeFindex transaction that deposits 100 USDC from
GALAXYVOIDAOPZTDLHILAJQKCVVFMD4IKLXLSZV5YHO7VY74IWZILUTO into the mainnet vault CBNKCU3HGFKHFOF7JTGXQCNKE3G3DXS5RDBQUKQMIIECYKXPIOUGB2S3, investing it
right away with 0.5% slippage. Print the unsigned XDR. The DeFindex API key is in the environment variable EVAL_DEFINDEX_API_KEY.
