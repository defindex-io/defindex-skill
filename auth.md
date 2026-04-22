# Defindex API — Authentication

Base URL: `https://api.defindex.io`

---

## Full Registration & Login Flow

```
[1] POST /register              →  create account
[2] POST /login                 →  get access_token + refresh_token
[3] POST /api-keys/generate     →  get long-lived API key (use as Bearer token)
```

Web UI equivalents (HTML form, same endpoints):
- Register: https://api.defindex.io/register
- Login:    https://api.defindex.io/login

---

## Step 1 — Register

```http
POST https://api.defindex.io/register
Content-Type: application/json

{
  "email": "you@example.com",
  "password": "SecurePassword123!",
  "username": "your_username"
}
```

Response `201`:
```json
{ "message": "User your_username registered" }
```

Errors:
- `400` — invalid data or username/email already taken

---

## Step 2 — Login

```http
POST https://api.defindex.io/login
Content-Type: application/json

{
  "email": "you@example.com",
  "password": "SecurePassword123!"
}
```

Response `200`:
```json
{
  "username": "your_username",
  "role": "USER",
  "access_token": "eyJhbGci...",
  "refresh_token": "eyJhbGci..."
}
```

- `access_token` — short-lived JWT; use to call protected endpoints until key is generated
- `refresh_token` — longer-lived; use with `POST /refresh` to obtain new access tokens

---

## Step 3 — Generate API Key

Use the `access_token` from login as the Bearer token:

```http
POST https://api.defindex.io/api-keys/generate
Authorization: Bearer <access_token>
Content-Type: application/json

{ "name": "my-app-key" }
```

Response `201`:
```json
{
  "key": "sk_1234567890abcdef...",
  "id": 1
}
```

**Important:** Only one API key per user is active at a time. Generating a new key automatically revokes the previous one.

Store `key` as `DEFINDEX_API_KEY` in your environment. Use it as the Bearer token for all subsequent API calls.

---

## Step 4 — Use the API Key in Requests

```http
Authorization: Bearer sk_1234567890abcdef...
```

TypeScript pattern:
```ts
const DEFINDEX_API_KEY = process.env.DEFINDEX_API_KEY!;

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${DEFINDEX_API_KEY}`,
};

const res = await fetch(`https://api.defindex.io/vault/${vaultAddress}/deposit?network=mainnet`, {
  method: "POST",
  headers,
  body: JSON.stringify({ amounts: [Number(amountStroops)], caller: stellarAddress, invest: true }),
});
```

---

## Refresh Access Token

When the short-lived JWT `access_token` expires (not the API key itself):

```http
POST https://api.defindex.io/refresh
Authorization: Bearer <refresh_token>
```

Response `200`:
```json
{
  "username": "your_username",
  "role": "USER",
  "access_token": "eyJhbGci...",
  "refresh_token": "eyJhbGci..."
}
```

---

## List API Keys

```http
GET https://api.defindex.io/api-keys
Authorization: Bearer <access_token>
```

Response `200` — array of key objects:
```json
[
  {
    "id": 1,
    "name": "my-app-key",
    "key": "sk_...",
    "createdAt": "2024-01-01T00:00:00Z",
    "lastUsedAt": "2024-01-15T12:30:00Z"
  }
]
```

---

## Revoke API Key

```http
POST https://api.defindex.io/api-keys/:keyId/revoke
Authorization: Bearer <access_token>
Content-Type: application/json

{ "keyId": 1 }
```

Response `200`:
```json
{ "success": true }
```

---

## Auth Error Reference

| Status | Meaning | Fix |
|---|---|---|
| `400` | Bad registration data / user already exists | Check email format; try a different username |
| `401` | Missing or invalid Bearer token | Verify `DEFINDEX_API_KEY` is set and uses `Bearer ` prefix |
| `403` | Role insufficient for this operation | Ensure caller has the required vault role |
| `429` | Rate limit exceeded | Back off using `retryAfter` from response body |
