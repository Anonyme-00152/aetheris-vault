export interface Entry {
  id: string
  service: string
  username: string
  password: string
  url: string
  category: string
  notes: string
  /** base32 secret or otpauth:// URI */
  totp: string
  favorite: boolean
  createdAt: number
  updatedAt: number
  passwordUpdatedAt: number
}

export interface FileMeta {
  id: string
  name: string
  type: string
  size: number
  addedAt: number
}

export interface VaultSettings {
  /** 0 = never */
  autoLockMinutes: number
  /** 0 = never */
  clipboardClearSeconds: number
}

export interface VaultData {
  categories: string[]
  entries: Entry[]
  files: FileMeta[]
  settings: VaultSettings
}

export const UNCATEGORIZED = 'Sans catégorie'

export const DEFAULT_SETTINGS: VaultSettings = {
  autoLockMinutes: 5,
  clipboardClearSeconds: 30,
}

export function emptyVault(): VaultData {
  return {
    categories: ['Réseaux sociaux', 'Email', 'Banque', 'Travail'],
    entries: [],
    files: [],
    settings: { ...DEFAULT_SETTINGS },
  }
}

/** Fills every missing field so older or imported data always has the full shape. */
export function normalizeEntry(input: Partial<Entry> | Record<string, unknown>): Entry {
  const raw = input as Record<string, unknown>
  const now = Date.now()
  const created = typeof raw.createdAt === 'number' ? raw.createdAt : now
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : crypto.randomUUID(),
    service: String(raw.service ?? '').trim() || 'Sans nom',
    username: String(raw.username ?? ''),
    password: String(raw.password ?? ''),
    url: String(raw.url ?? ''),
    category: String(raw.category ?? '') || UNCATEGORIZED,
    notes: String(raw.notes ?? ''),
    totp: String(raw.totp ?? ''),
    favorite: Boolean(raw.favorite),
    createdAt: created,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : created,
    passwordUpdatedAt: typeof raw.passwordUpdatedAt === 'number' ? raw.passwordUpdatedAt : created,
  }
}

export function normalizeVault(input: Partial<VaultData> | Record<string, unknown>): VaultData {
  const raw = input as Partial<VaultData>
  const entries = Array.isArray(raw.entries) ? raw.entries.map((e) => normalizeEntry(e)) : []
  const categories = Array.isArray(raw.categories) ? raw.categories.map(String) : emptyVault().categories
  return {
    categories: [...new Set(categories)].filter((c) => c !== UNCATEGORIZED),
    entries,
    files: Array.isArray(raw.files)
      ? raw.files.map((f) => ({
          id: f.id,
          name: String(f.name),
          type: String(f.type || 'application/octet-stream'),
          size: Number(f.size) || 0,
          addedAt: Number(f.addedAt) || Date.now(),
        }))
      : [],
    settings: { ...DEFAULT_SETTINGS, ...(raw.settings ?? {}) },
  }
}
