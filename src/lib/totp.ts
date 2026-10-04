/** RFC 6238 time-based one-time passwords, computed locally with Web Crypto. */

export interface TotpConfig {
  secret: string
  digits: number
  period: number
  algorithm: 'SHA-1' | 'SHA-256' | 'SHA-512'
  issuer?: string
  account?: string
}

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Decode(input: string): Uint8Array<ArrayBuffer> {
  const clean = input.toUpperCase().replace(/[\s=-]/g, '')
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const c of clean) {
    const idx = B32.indexOf(c)
    if (idx < 0) throw new Error('Clé secrète invalide (base32 attendu).')
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return new Uint8Array(out)
}

/** Accepts a bare base32 secret or a full `otpauth://totp/...` URI. */
export function parseTotp(input: string): TotpConfig {
  const raw = input.trim()
  if (!raw) throw new Error('Clé vide.')
  if (raw.toLowerCase().startsWith('otpauth://')) {
    const url = new URL(raw)
    if (url.host.toLowerCase() !== 'totp') throw new Error('Seuls les codes TOTP sont pris en charge.')
    const p = url.searchParams
    const secret = p.get('secret') ?? ''
    const algo = (p.get('algorithm') ?? 'SHA1').toUpperCase().replace('SHA', 'SHA-')
    const label = decodeURIComponent(url.pathname.replace(/^\/+/, ''))
    const [issuerFromLabel, account] = label.includes(':') ? label.split(':', 2) : [undefined, label]
    const cfg: TotpConfig = {
      secret,
      digits: Number(p.get('digits') ?? 6),
      period: Number(p.get('period') ?? 30),
      algorithm: (['SHA-1', 'SHA-256', 'SHA-512'].includes(algo) ? algo : 'SHA-1') as TotpConfig['algorithm'],
      issuer: p.get('issuer') ?? issuerFromLabel,
      account: account || undefined,
    }
    base32Decode(cfg.secret)
    return cfg
  }
  const secret = raw.replace(/\s/g, '')
  if (base32Decode(secret).length < 10) throw new Error('Clé trop courte.')
  return { secret, digits: 6, period: 30, algorithm: 'SHA-1' }
}

export async function hotp(key: Uint8Array<ArrayBuffer>, counter: number, digits = 6, algorithm: TotpConfig['algorithm'] = 'SHA-1') {
  const msg = new ArrayBuffer(8)
  const view = new DataView(msg)
  view.setUint32(0, Math.floor(counter / 2 ** 32))
  view.setUint32(4, counter >>> 0)
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: algorithm }, false, ['sign'])
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', k, msg))
  const offset = mac[mac.length - 1] & 0x0f
  const bin =
    ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3]
  return String(bin % 10 ** digits).padStart(digits, '0')
}

export async function totpAt(cfg: TotpConfig, timeMs: number) {
  const counter = Math.floor(timeMs / 1000 / cfg.period)
  return hotp(base32Decode(cfg.secret), counter, cfg.digits, cfg.algorithm)
}
