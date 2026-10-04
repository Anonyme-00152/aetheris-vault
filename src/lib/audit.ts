import { analyze, type Score } from './strength'
import type { Entry } from './vault-types'

export const OLD_AFTER_DAYS = 365

export interface EntryHealth {
  score: Score
  bits: number
  reused: number
  old: boolean
  no2fa: boolean
}

export interface VaultHealth {
  /** 0–100 */
  score: number
  byId: Map<string, EntryHealth>
  weak: Entry[]
  reused: Entry[]
  old: Entry[]
  no2fa: Entry[]
}

export function auditVault(entries: Entry[], now = Date.now()): VaultHealth {
  const counts = new Map<string, number>()
  for (const e of entries) if (e.password) counts.set(e.password, (counts.get(e.password) ?? 0) + 1)

  const byId = new Map<string, EntryHealth>()
  const weak: Entry[] = []
  const reused: Entry[] = []
  const old: Entry[] = []
  const no2fa: Entry[] = []
  let points = 0

  for (const e of entries) {
    const a = analyze(e.password)
    const h: EntryHealth = {
      score: a.score,
      bits: a.bits,
      reused: e.password ? (counts.get(e.password) ?? 1) - 1 : 0,
      old: now - e.passwordUpdatedAt > OLD_AFTER_DAYS * 86_400_000,
      no2fa: !e.totp,
    }
    byId.set(e.id, h)
    if (e.password && h.score < 3) weak.push(e)
    if (h.reused) reused.push(e)
    if (h.old) old.push(e)
    if (h.no2fa) no2fa.push(e)
    // Each entry weighs the same: strength counts most, then uniqueness, then age.
    points += (e.password ? h.score / 4 : 0) * 0.6 + (h.reused ? 0 : 0.3) + (h.old ? 0 : 0.1)
  }

  const score = entries.length ? Math.round((points / entries.length) * 100) : 100
  return { score, byId, weak, reused, old, no2fa }
}
