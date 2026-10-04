import { normalizeEntry, type Entry } from './vault-types'

/** RFC 4180 parser: quoted fields, escaped quotes, CRLF and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  const src = text.replace(/^\uFEFF/, '')
  const firstLine = src.split(/\r?\n/, 1)[0]
  const delimiter = firstLine.includes(';') && !firstLine.includes(',') ? ';' : ','
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === delimiter) {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(field)
      if (row.some((f) => f !== '')) rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  row.push(field)
  if (row.some((f) => f !== '')) rows.push(row)
  return rows
}

// Header names used by Chrome, Edge, Firefox, Safari, Bitwarden, 1Password, LastPass, KeePass.
const COLUMNS: Record<keyof Pick<Entry, 'service' | 'url' | 'username' | 'password' | 'notes' | 'totp' | 'category'>, string[]> = {
  service: ['name', 'title', 'service', 'account'],
  url: ['url', 'login_uri', 'website', 'web site', 'hostname', 'origin'],
  username: ['username', 'login_username', 'login', 'user name', 'email', 'user'],
  password: ['password', 'login_password', 'pass'],
  notes: ['note', 'notes', 'extra', 'comments'],
  totp: ['totp', 'login_totp', 'otpauth', 'otp'],
  category: ['folder', 'grouping', 'group', 'category', 'type'],
}

export function entriesFromCsv(text: string): Entry[] {
  const rows = parseCsv(text)
  if (rows.length < 2) throw new Error('Le fichier CSV est vide.')
  const header = rows[0].map((h) => h.trim().toLowerCase())
  const index = Object.fromEntries(
    Object.entries(COLUMNS).map(([k, names]) => [k, header.findIndex((h) => names.includes(h))]),
  ) as Record<keyof typeof COLUMNS, number>
  if (index.password < 0) throw new Error('Colonne « password » introuvable dans le CSV.')
  return rows.slice(1).map((r) => {
    const get = (k: keyof typeof COLUMNS) => (index[k] >= 0 ? (r[index[k]] ?? '').trim() : '')
    const url = get('url')
    let service = get('service')
    if (!service && url) {
      try {
        service = new URL(/^https?:\/\//.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '')
      } catch {
        service = url
      }
    }
    return normalizeEntry({
      service,
      url,
      username: get('username'),
      password: r[index.password] ?? '',
      notes: get('notes'),
      totp: get('totp'),
      category: get('category'),
    })
  })
}
