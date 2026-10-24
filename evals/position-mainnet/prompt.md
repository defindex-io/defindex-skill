---
description: Read a mainnet position correctly, shares vs underlying
tags: [mainnet, read, needs-key]
runs: 1
max_turns: 20
allowed_tools: [Read, Glob, Grep, Skill]
---

How much does the Stellar account GALAXYVOIDAOPZTDLHILAJQKCVVFMD4IKLXLSZV5YHO7VY74IWZILUTO hold in the DeFindex mainnet vault
CBNKCU3HGFKHFOF7JTGXQCNKE3G3DXS5RDBQUKQMIIECYKXPIOUGB2S3? Give the vault shares and the value in the vault's asset, in human
units. The DeFindex API key is in the environment variable EVAL_DEFINDEX_API_KEY. Do not build or submit any transaction.
