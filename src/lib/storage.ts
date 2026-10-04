import { clear, createStore, del, get, set } from 'idb-keyval'
import {
  createDataKey,
  deriveKek,
  deriveLegacyKey,
  fromB64,
  newKdf,
  openBytes,
  openJson,
  sealBytes,
  sealJson,
  toB64,
  unwrapDataKey,
  wrapDataKey,
  type KdfParams,
  type Sealed,
  type SealedBytes,
} from './crypto'
import { emptyVault, normalizeVault, type FileMeta, type VaultData } from './vault-types'

const store = createStore('aetheris', 'kv')
const RECORD_KEY = 'vault'
const fileKey = (id: string) => `file:${id}`

/** Format written by the first version of the app (single key in localStorage). */
export const LEGACY_KEY = 'aetheris_vault_v1'

interface StoredVault {
  format: 'aetheris-vault'
  version: 2
  kdf: KdfParams
  wrappedKey: Sealed
  data: Sealed
  updatedAt: number
}

export interface Session {
  dek: CryptoKey
  kdf: KdfParams
  wrappedKey: Sealed
}

export type VaultPresence = 'none' | 'vault' | 'legacy'

export async function detectVault(): Promise<VaultPresence> {
  if (await get(RECORD_KEY, store)) return 'vault'
  if (localStorage.getItem(LEGACY_KEY)) return 'legacy'
  return 'none'
}

export async function lastUpdated(): Promise<number | null> {
  const rec = await get<StoredVault>(RECORD_KEY, store)
  return rec?.updatedAt ?? null
}

async function writeRecord(session: Session, data: VaultData) {
  const rec: StoredVault = {
    format: 'aetheris-vault',
    version: 2,
    kdf: session.kdf,
    wrappedKey: session.wrappedKey,
    data: await sealJson(data, session.dek),
    updatedAt: Date.now(),
  }
  await set(RECORD_KEY, rec, store)
}

async function newSession(password: string): Promise<Session> {
  const kdf = newKdf()
  const dek = await createDataKey()
  const wrappedKey = await wrapDataKey(dek, await deriveKek(password, kdf))
  return { dek, kdf, wrappedKey }
}

export async function createVault(password: string, initial: VaultData = emptyVault()) {
  const session = await newSession(password)
  await writeRecord(session, initial)
  // Ask the browser not to evict our data under storage pressure.
  navigator.storage?.persist?.().catch(() => {})
  return { session, data: initial }
}

export class WrongPasswordError extends Error {
  constructor() {
    super('Mot de passe maître incorrect.')
    this.name = 'WrongPasswordError'
  }
}

export async function unlockVault(password: string): Promise<{ session: Session; data: VaultData; migrated: boolean }> {
  const rec = await get<StoredVault>(RECORD_KEY, store)
  if (rec) {
    let dek: CryptoKey
    try {
      dek = await unwrapDataKey(rec.wrappedKey, await deriveKek(password, rec.kdf))
    } catch {
      throw new WrongPasswordError()
    }
    const data = normalizeVault(await openJson(rec.data, dek))
    return { session: { dek, kdf: rec.kdf, wrappedKey: rec.wrappedKey }, data, migrated: false }
  }
  return migrateLegacy(password)
}

interface LegacyFile extends FileMeta {
  data: string
}

/**
 * v1 stored everything (files included, base64) in one localStorage blob,
 * encrypted with a PBKDF2-250k key. We decrypt it, re-encrypt under the v2
 * envelope scheme in IndexedDB, check the result reads back, and only then
 * remove the old copy.
 */
async function migrateLegacy(password: string) {
  const raw = localStorage.getItem(LEGACY_KEY)
  if (!raw) throw new Error('Aucun coffre trouvé.')
  const stored = JSON.parse(raw) as { salt: string; blob: Sealed }
  let legacy: Record<string, unknown> & { files?: LegacyFile[] }
  try {
    legacy = await openJson(stored.blob, await deriveLegacyKey(password, stored.salt))
  } catch {
    throw new WrongPasswordError()
  }
  const files = Array.isArray(legacy.files) ? legacy.files : []
  const data = normalizeVault({ ...legacy, files })
  const session = await newSession(password)
  for (const f of files) {
    if (typeof f.data === 'string') await putFileBytes(session, f.id, fromB64(f.data))
  }
  await writeRecord(session, data)
  const check = await unlockVault(password)
  if (check.data.entries.length !== data.entries.length) throw new Error('Migration interrompue.')
  localStorage.removeItem(LEGACY_KEY)
  return { session: check.session, data: check.data, migrated: true }
}

export async function saveVault(session: Session, data: VaultData) {
  await writeRecord(session, data)
}

/** Re-wraps the data key: instant, whatever the size of the vault. */
export async function changeMasterPassword(session: Session, current: string, next: string, data: VaultData) {
  try {
    await unwrapDataKey(session.wrappedKey, await deriveKek(current, session.kdf))
  } catch {
    throw new WrongPasswordError()
  }
  const kdf = newKdf()
  const wrappedKey = await wrapDataKey(session.dek, await deriveKek(next, kdf))
  const updated: Session = { dek: session.dek, kdf, wrappedKey }
  await writeRecord(updated, data)
  return updated
}

/* ---------------------------------------------------------------- files */

async function putFileBytes(session: Session, id: string, bytes: BufferSource) {
  await set(fileKey(id), await sealBytes(bytes, session.dek), store)
}

export async function putFile(session: Session, file: File): Promise<FileMeta> {
  const meta: FileMeta = {
    id: crypto.randomUUID(),
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    addedAt: Date.now(),
  }
  await putFileBytes(session, meta.id, await file.arrayBuffer())
  return meta
}

export async function readFile(session: Session, meta: FileMeta): Promise<Blob> {
  const sealed = await get<SealedBytes>(fileKey(meta.id), store)
  if (!sealed) throw new Error('Fichier introuvable.')
  return new Blob([await openBytes(sealed, session.dek)], { type: meta.type })
}

export async function removeFile(id: string) {
  await del(fileKey(id), store)
}

export async function destroyVault() {
  await clear(store)
  localStorage.removeItem(LEGACY_KEY)
}

export async function storageEstimate() {
  try {
    const e = await navigator.storage?.estimate?.()
    return e ? { usage: e.usage ?? 0, quota: e.quota ?? 0 } : null
  } catch {
    return null
  }
}

/* ------------------------------------------------------------- backups */

interface EncryptedBackup {
  format: 'aetheris-backup'
  version: 2
  exportedAt: string
  kdf: KdfParams
  wrappedKey: Sealed
  data: Sealed
  files: { id: string; iv: string; ct: string }[]
}

/** The backup is protected by the current master password (same envelope). */
export async function exportEncrypted(session: Session, data: VaultData): Promise<Blob> {
  const files: EncryptedBackup['files'] = []
  for (const f of data.files) {
    const sealed = await get<SealedBytes>(fileKey(f.id), store)
    if (sealed) files.push({ id: f.id, iv: toB64(sealed.iv), ct: toB64(sealed.ct) })
  }
  const backup: EncryptedBackup = {
    format: 'aetheris-backup',
    version: 2,
    exportedAt: new Date().toISOString(),
    kdf: session.kdf,
    wrappedKey: session.wrappedKey,
    data: await sealJson(data, session.dek),
    files,
  }
  return new Blob([JSON.stringify(backup)], { type: 'application/json' })
}

/** Unencrypted JSON, readable by the v1 app too. */
export async function exportPlain(session: Session, data: VaultData): Promise<Blob> {
  const files = []
  for (const f of data.files) {
    try {
      const blob = await readFile(session, f)
      files.push({ ...f, data: toB64(await blob.arrayBuffer()) })
    } catch {
      /* skip unreadable file */
    }
  }
  const out = {
    format: 'aetheris-plain',
    version: 2,
    exportedAt: new Date().toISOString(),
    categories: data.categories,
    entries: data.entries,
    files,
  }
  return new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' })
}

export interface ImportedFile {
  meta: FileMeta
  bytes: Uint8Array<ArrayBuffer>
}

export interface ImportPayload {
  data: VaultData
  files: ImportedFile[]
}

export type ParsedImport =
  | { kind: 'encrypted'; open: (password: string) => Promise<ImportPayload> }
  | { kind: 'plain'; payload: ImportPayload }

export function parseJsonImport(text: string): ParsedImport {
  const json = JSON.parse(text)
  if (json?.format === 'aetheris-backup') {
    const b = json as EncryptedBackup
    return {
      kind: 'encrypted',
      open: async (password) => {
        let dek: CryptoKey
        try {
          dek = await unwrapDataKey(b.wrappedKey, await deriveKek(password, b.kdf))
        } catch {
          throw new WrongPasswordError()
        }
        const data = normalizeVault(await openJson(b.data, dek))
        const files: ImportedFile[] = []
        for (const f of b.files) {
          const meta = data.files.find((m) => m.id === f.id)
          if (!meta) continue
          const bytes = await openBytes({ iv: fromB64(f.iv), ct: fromB64(f.ct).buffer }, dek)
          files.push({ meta, bytes: new Uint8Array(bytes) })
        }
        return { data, files }
      },
    }
  }
  if (json && Array.isArray(json.entries)) {
    const rawFiles: LegacyFile[] = Array.isArray(json.files) ? json.files : []
    const data = normalizeVault({ ...json, files: rawFiles })
    const files: ImportedFile[] = rawFiles
      .map((f, i) => ({ f, meta: data.files[i] }))
      .filter(({ f }) => typeof f.data === 'string')
      .map(({ f, meta }) => ({ meta, bytes: fromB64(f.data) }))
    return { kind: 'plain', payload: { data, files } }
  }
  throw new Error('Format de fichier non reconnu.')
}

/** Stores imported files under fresh ids and returns their metadata. */
export async function storeImportedFiles(session: Session, files: ImportedFile[]): Promise<FileMeta[]> {
  const out: FileMeta[] = []
  for (const f of files) {
    const meta = { ...f.meta, id: crypto.randomUUID() }
    await putFileBytes(session, meta.id, f.bytes)
    out.push(meta)
  }
  return out
}
