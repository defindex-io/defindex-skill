// Shared helpers for the examples: a fetch wrapper, network config and a throwaway testnet signer.
import { Keypair, Networks, TransactionBuilder } from '@stellar/stellar-sdk'

export const API = process.env.DEFINDEX_API_URL ?? 'https://api.defindex.io'
export type Network = 'mainnet' | 'testnet'

export const NETWORK: Network = process.argv.includes('--mainnet') ? 'mainnet' : 'testnet'
export const PASSPHRASE = NETWORK === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET

// Testnet vault from https://github.com/defindex-io/stellar-contracts/blob/main/public/testnet.contracts.json
// (xlm_paltalabs_vault). Mainnet default is the USDC vault used as the example in the API spec.
export const DEFAULT_VAULT: Record<Network, string> = {
  testnet: 'CCLV4H7WTLJQ7ATLHBBQV2WW3OINF3FOY5XZ7VPHZO7NH3D2ZS4GFSF6',
  mainnet: 'CBNKCU3HGFKHFOF7JTGXQCNKE3G3DXS5RDBQUKQMIIECYKXPIOUGB2S3',
}

export function apiKey(): string {
  const key = process.env.DEFINDEX_API_KEY
  if (!key) {
    console.error('Set DEFINDEX_API_KEY. Get a key at https://console.defindex.io (API Keys).')
    process.exit(2)
  }
  return key
}

export class DefindexError extends Error {
  constructor(
    readonly status: number,
    readonly body: Record<string, unknown>,
    readonly correlationId: string | null,
  ) {
    super(`DeFindex ${status}: ${JSON.stringify(body)} (x-correlation-id ${correlationId})`)
  }
}

/** Calls the API with a timeout and the network query, and throws DefindexError on a non-2xx. */
export async function dfx<T>(method: 'GET' | 'POST', path: string, body?: unknown, key?: string): Promise<T> {
  const sep = path.includes('?') ? '&' : '?'
  const res = await fetch(`${API}${path}${sep}network=${NETWORK}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(method === 'GET' ? 10_000 : 60_000),
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : {}
  if (!res.ok) throw new DefindexError(res.status, json, res.headers.get('x-correlation-id'))
  return json as T
}

/** A fresh testnet account funded by Friendbot. Never used on mainnet. */
export async function friendbotKeypair(): Promise<Keypair> {
  if (NETWORK !== 'testnet') throw new Error('friendbotKeypair is testnet only')
  const kp = Keypair.random()
  const res = await fetch(`https://friendbot.stellar.org/?addr=${kp.publicKey()}`, { signal: AbortSignal.timeout(30_000) })
  if (!res.ok) throw new Error(`Friendbot failed: ${res.status} ${await res.text()}`)
  return kp
}

export function sign(xdr: string, kp: Keypair): string {
  const tx = TransactionBuilder.fromXDR(xdr, PASSPHRASE)
  tx.sign(kp)
  return tx.toXDR()
}

export function assertTestnetForSubmit(): void {
  if (NETWORK !== 'testnet') throw new Error('These examples never submit on mainnet.')
}
