import { describe, expect, it } from 'vitest'
import { auditVault } from './audit'
import {
  createDataKey,
  deriveKek,
  deriveLegacyKey,
  newKdf,
  openJson,
  sealJson,
  toB64,
  fromB64,
  unwrapDataKey,
  wrapDataKey,
} from './crypto'
import { entriesFromCsv, parseCsv } from './csv'
import {
  DEFAULT_PASSWORD,
  activeSets,
  generatePassphrase,
  generatePassword,
  generatePin,
  passwordBits,
} from './generator'
import { randomInt } from './random'
import { analyze, crackTime } from './strength'
import { base32Decode, hotp, parseTotp, totpAt } from './totp'
import { normalizeEntry } from './vault-types'
import { WORDS } from './wordlist-fr'

describe('random', () => {
  it('stays in range and covers every value', () => {
    const seen = new Set<number>()
    for (let i = 0; i < 5000; i++) {
      const n = randomInt(7)
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThan(7)
      seen.add(n)
    }
    expect(seen.size).toBe(7)
  })

  it('is not biased towards low values', () => {
    // 3 does not divide 2^32: a naive modulo would skew the counts.
    const counts = [0, 0, 0]
    const N = 60_000
    for (let i = 0; i < N; i++) counts[randomInt(3)]++
    for (const c of counts) expect(Math.abs(c - N / 3)).toBeLessThan(N * 0.02)
  })
})

describe('generator', () => {
  it('honours length and includes every enabled class', () => {
    for (let i = 0; i < 200; i++) {
      const { value } = generatePassword({ ...DEFAULT_PASSWORD, length: 8 })
      expect(value).toHaveLength(8)
      expect(value).toMatch(/[A-Z]/)
      expect(value).toMatch(/[a-z]/)
      expect(value).toMatch(/\d/)
      expect(value).toMatch(/[^A-Za-z0-9]/)
    }
  })

  it('removes ambiguous and excluded characters', () => {
    const o = { ...DEFAULT_PASSWORD, length: 128, avoidAmbiguous: true, exclude: 'xyz' }
    for (let i = 0; i < 20; i++) expect(generatePassword(o).value).not.toMatch(/[Il1|O0oB8S5Z2xyz]/)
  })

  it('computes exact entropy with inclusion–exclusion', () => {
    // 2 classes of 1 char each, length 2: only "ab" and "ba" are valid → 1 bit.
    expect(passwordBits([1, 1], 2)).toBeCloseTo(1, 6)
    // Single class: plain L·log2(n).
    expect(passwordBits([26], 10)).toBeCloseTo(10 * Math.log2(26), 6)
    // Constraint costs a little entropy at length 20.
    const sets = activeSets(DEFAULT_PASSWORD).map((s) => s.length)
    const pool = sets.reduce((a, b) => a + b)
    const bits = passwordBits(sets, 20)
    expect(bits).toBeLessThan(20 * Math.log2(pool))
    expect(bits).toBeGreaterThan(20 * Math.log2(pool) - 1)
  })

  it('builds passphrases from the list', () => {
    expect(WORDS).toHaveLength(1024)
    expect(new Set(WORDS).size).toBe(1024)
    const { value, bits } = generatePassphrase({ words: 5, separator: '-', capitalize: false, addNumber: false })
    const parts = value.split('-')
    expect(parts).toHaveLength(5)
    for (const p of parts) expect(WORDS).toContain(p)
    expect(bits).toBe(50)
  })

  it('builds PINs', () => {
    const { value, bits } = generatePin({ length: 6 })
    expect(value).toMatch(/^\d{6}$/)
    expect(bits).toBeCloseTo(6 * Math.log2(10))
  })
})

describe('strength', () => {
  it('flags common passwords', () => {
    expect(analyze('azerty').score).toBe(0)
    expect(analyze('P@ssw0rd').score).toBe(0)
  })
  it('penalises patterns', () => {
    expect(analyze('Soleil2024').score).toBeLessThanOrEqual(1)
    expect(analyze('abcdefgh12345678').score).toBeLessThanOrEqual(2)
  })
  it('rewards random strings', () => {
    expect(analyze('q7#Vt9!mZp2$Lx4@Rw8&').score).toBe(4)
  })
  it('formats crack times', () => {
    expect(crackTime(10, 1e11)).toBe('Instantané')
    expect(crackTime(128, 1e11)).toMatch(/^10\S+ ans$/)
  })
})

describe('totp (RFC 4226 / RFC 6238 vectors)', () => {
  const secret = new TextEncoder().encode('12345678901234567890')
  it('hotp', async () => {
    const expected = ['755224', '287082', '359152', '969429', '338314']
    for (let i = 0; i < expected.length; i++) expect(await hotp(secret, i)).toBe(expected[i])
  })
  it('totp sha1', async () => {
    const b32 = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
    expect(base32Decode(b32)).toEqual(secret)
    const cfg = { secret: b32, digits: 8, period: 30, algorithm: 'SHA-1' as const }
    expect(await totpAt(cfg, 59_000)).toBe('94287082')
    expect(await totpAt(cfg, 1111111109_000)).toBe('07081804')
    expect(await totpAt(cfg, 20000000000_000)).toBe('65353130')
  })
  it('parses otpauth URIs', () => {
    const c = parseTotp('otpauth://totp/GitHub:ebu?secret=JBSWY3DPEHPK3PXP&issuer=GitHub&digits=6')
    expect(c).toMatchObject({ issuer: 'GitHub', account: 'ebu', digits: 6, period: 30, algorithm: 'SHA-1' })
  })
})

describe('crypto', () => {
  it('round-trips through the envelope and rejects a wrong password', async () => {
    const kdf = { ...newKdf(), iterations: 1000 }
    const dek = await createDataKey()
    const wrapped = await wrapDataKey(dek, await deriveKek('correct horse', kdf))
    const sealed = await sealJson({ hello: 'monde' }, dek)

    const again = await unwrapDataKey(wrapped, await deriveKek('correct horse', kdf))
    expect(await openJson(sealed, again)).toEqual({ hello: 'monde' })
    await expect(unwrapDataKey(wrapped, await deriveKek('wrong', kdf))).rejects.toThrow()
  })

  it('opens data sealed by the v1 app', async () => {
    // Reproduces vault.html v1: PBKDF2-250k key used directly for AES-GCM.
    const salt = toB64(crypto.getRandomValues(new Uint8Array(16)))
    const key = await deriveLegacyKey('ancien-mdp', salt)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const ct = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(JSON.stringify({ entries: [{ service: 'Mail' }] })),
    )
    const out = await openJson<{ entries: { service: string }[] }>({ iv: toB64(iv), ct: toB64(ct) }, key)
    expect(out.entries[0].service).toBe('Mail')
    expect(fromB64(toB64(iv))).toEqual(iv)
  }, 20_000)
})

describe('csv import', () => {
  it('parses quoted fields', () => {
    expect(parseCsv('a,b\n"x, ""y""",z\n')).toEqual([
      ['a', 'b'],
      ['x, "y"', 'z'],
    ])
  })
  it('maps Chrome exports', () => {
    const rows = entriesFromCsv(
      'name,url,username,password,note\nGitHub,https://github.com,ebu,"p;a,ss",\n,https://www.lemonde.fr/,me,x,\n',
    )
    expect(rows[0]).toMatchObject({ service: 'GitHub', username: 'ebu', password: 'p;a,ss' })
    expect(rows[1].service).toBe('lemonde.fr')
  })
})

describe('audit', () => {
  it('finds reused and weak passwords', () => {
    const a = normalizeEntry({ service: 'A', password: 'azerty' })
    const b = normalizeEntry({ service: 'B', password: 'azerty' })
    const c = normalizeEntry({ service: 'C', password: 'q7#Vt9!mZp2$Lx4@Rw8&', totp: 'X' })
    const h = auditVault([a, b, c])
    expect(h.reused.map((e) => e.service)).toEqual(['A', 'B'])
    expect(h.weak).toHaveLength(2)
    expect(h.score).toBeGreaterThan(0)
    expect(h.score).toBeLessThan(100)
  })
})
