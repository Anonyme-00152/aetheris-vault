/**
 * Envelope encryption with the Web Crypto API.
 *
 *   master password ──PBKDF2-SHA-256 (600 000)──▶ KEK  (never stored)
 *   random 256-bit DEK ──AES-GCM wrap with KEK──▶ wrappedKey (stored)
 *   vault JSON & files ──AES-GCM with DEK────────▶ ciphertexts (stored)
 *
 * Changing the master password only re-wraps the DEK: the data itself is
 * never re-encrypted, and every ciphertext gets its own random 96-bit IV.
 */

export const KDF_ITERATIONS = 600_000
export const LEGACY_ITERATIONS = 250_000

const enc = new TextEncoder()
const dec = new TextDecoder()

export interface KdfParams {
  name: 'PBKDF2'
  hash: 'SHA-256'
  iterations: number
  salt: string
}

export interface Sealed {
  iv: string
  ct: string
}

export interface SealedBytes {
  iv: Uint8Array<ArrayBuffer>
  ct: ArrayBuffer
}

export function toB64(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(s)
}

export function fromB64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(n))
}

export function newKdf(iterations = KDF_ITERATIONS): KdfParams {
  return { name: 'PBKDF2', hash: 'SHA-256', iterations, salt: toB64(randomBytes(16)) }
}

async function baseKey(password: string) {
  return crypto.subtle.importKey('raw', enc.encode(password.normalize('NFC')), 'PBKDF2', false, ['deriveKey'])
}

/** Key-encryption key: can only wrap / unwrap the data key. */
export async function deriveKek(password: string, kdf: KdfParams): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromB64(kdf.salt), iterations: kdf.iterations, hash: kdf.hash },
    await baseKey(password),
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey'],
  )
}

/** v1 format: the derived key encrypted the data directly. */
export async function deriveLegacyKey(password: string, salt: string): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromB64(salt), iterations: LEGACY_ITERATIONS, hash: 'SHA-256' },
    await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']),
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function createDataKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
}

export async function wrapDataKey(dek: CryptoKey, kek: CryptoKey): Promise<Sealed> {
  const iv = randomBytes(12)
  const ct = await crypto.subtle.wrapKey('raw', dek, kek, { name: 'AES-GCM', iv })
  return { iv: toB64(iv), ct: toB64(ct) }
}

/** Throws (OperationError) when the password is wrong: GCM authentication fails. */
export async function unwrapDataKey(wrapped: Sealed, kek: CryptoKey): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey(
    'raw',
    fromB64(wrapped.ct),
    kek,
    { name: 'AES-GCM', iv: fromB64(wrapped.iv) },
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )
}

export async function sealBytes(data: BufferSource, key: CryptoKey): Promise<SealedBytes> {
  const iv = randomBytes(12)
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  return { iv, ct }
}

export async function openBytes(sealed: SealedBytes, key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: sealed.iv }, key, sealed.ct)
}

export async function sealJson(value: unknown, key: CryptoKey): Promise<Sealed> {
  const { iv, ct } = await sealBytes(enc.encode(JSON.stringify(value)), key)
  return { iv: toB64(iv), ct: toB64(ct) }
}

export async function openJson<T>(sealed: Sealed, key: CryptoKey): Promise<T> {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(sealed.iv) }, key, fromB64(sealed.ct))
  return JSON.parse(dec.decode(pt)) as T
}

export async function sha1Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-1', enc.encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()
}
