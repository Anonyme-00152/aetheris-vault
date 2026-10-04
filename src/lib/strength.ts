import { COMMON_PASSWORDS } from './common-passwords'
import { WORDS } from './wordlist-fr'

export type Score = 0 | 1 | 2 | 3 | 4

export const SCORE_LABELS: Record<Score, string> = {
  0: 'Très faible',
  1: 'Faible',
  2: 'Moyen',
  3: 'Solide',
  4: 'Excellent',
}

/** Entropy thresholds (bits) for each score. */
export function scoreFromBits(bits: number): Score {
  if (bits < 28) return 0
  if (bits < 40) return 1
  if (bits < 60) return 2
  if (bits < 80) return 3
  return 4
}

export interface Scenario {
  id: string
  label: string
  detail: string
  /** guesses per second */
  rate: number
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'online',
    label: 'Attaque en ligne',
    detail: 'Service web qui limite les tentatives (≈ 10 essais/s)',
    rate: 10,
  },
  {
    id: 'slow',
    label: 'Fuite, hachage lent',
    detail: 'Base volée, bcrypt / Argon2 (≈ 10 000 essais/s)',
    rate: 1e4,
  },
  {
    id: 'fast',
    label: 'Fuite, hachage rapide',
    detail: 'Base volée, MD5 / SHA-1 sur grappe de GPU (≈ 100 milliards/s)',
    rate: 1e11,
  },
]

export const DEFAULT_SCENARIO = SCENARIOS[2]

const SUP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
}
const sup = (n: number) => String(n).replace(/\d/g, (d) => SUP[d])

const UNITS: [string, string, number][] = [
  ['seconde', 'secondes', 1],
  ['minute', 'minutes', 60],
  ['heure', 'heures', 3600],
  ['jour', 'jours', 86400],
  ['mois', 'mois', 2.63e6],
  ['an', 'ans', 3.156e7],
  ['siècle', 'siècles', 3.156e9],
]

/**
 * Average time to find a secret of `bits` entropy (half the space) at
 * `rate` guesses per second, as short French text.
 */
export function crackTime(bits: number, rate: number): string {
  const log10s = (bits - 1) * Math.LOG10E * Math.LN2 - Math.log10(rate)
  if (log10s < 0) return 'Instantané'
  const seconds = 10 ** log10s
  if (log10s < Math.log10(3.156e11)) {
    let unit = UNITS[0]
    for (const u of UNITS) if (seconds >= u[2]) unit = u
    const n = Math.round(seconds / unit[2])
    return `${n.toLocaleString('fr-FR')} ${n > 1 ? unit[1] : unit[0]}`
  }
  const years = log10s - Math.log10(3.156e7)
  if (years < 6) return `${Math.round(10 ** years).toLocaleString('fr-FR')} ans`
  return `10${sup(Math.floor(years))} ans`
}

/* ------------------------------------------------------------------ */
/* Estimating a password typed by a human                              */
/* ------------------------------------------------------------------ */

export interface Finding {
  kind: 'common' | 'word' | 'sequence' | 'repeat' | 'date' | 'keyboard' | 'short' | 'classes'
  message: string
}

export interface Analysis {
  bits: number
  score: Score
  findings: Finding[]
  classes: { lower: boolean; upper: boolean; digits: boolean; symbols: boolean }
  length: number
}

const KEYBOARD_ROWS = [
  'azertyuiop', 'qsdfghjklm', 'wxcvbn',
  'qwertyuiop', 'asdfghjkl', 'zxcvbnm',
  '1234567890',
]
const SEQUENCES = 'abcdefghijklmnopqrstuvwxyz'
const DIGIT_SEQ = '01234567890'

const LEET: Record<string, string> = {
  '4': 'a', '@': 'a', '3': 'e', '1': 'i', '!': 'i', '0': 'o', '5': 's', '$': 's', '7': 't', '8': 'b',
}

const DICTIONARY = new Set<string>([
  ...WORDS,
  'bonjour', 'salut', 'amour', 'soleil', 'chat', 'chien', 'france', 'paris', 'marseille', 'lyon',
  'password', 'admin', 'welcome', 'dragon', 'monkey', 'master', 'secret', 'love', 'hello', 'football',
  'princesse', 'loulou', 'doudou', 'chouchou', 'nicolas', 'thomas', 'julien', 'camille', 'marie',
  'louis', 'lucas', 'emma', 'jade', 'sarah', 'pierre', 'jean', 'michel', 'olivier', 'nathalie',
  'motdepasse', 'azerty', 'qwerty', 'liberte', 'famille', 'vacances', 'printemps', 'ete', 'hiver',
  // frequent English words
  'correct', 'horse', 'battery', 'staple', 'troubador', 'troubadour', 'sunshine', 'shadow', 'summer',
  'winter', 'spring', 'autumn', 'flower', 'purple', 'orange', 'yellow', 'silver', 'golden', 'house',
  'money', 'happy', 'friend', 'family', 'freedom', 'forever', 'angel', 'baby', 'computer', 'internet',
  'google', 'apple', 'samsung', 'pokemon', 'minecraft', 'fortnite', 'chelsea', 'arsenal', 'liverpool',
  'qwertz', 'letmein', 'welcome', 'access', 'login', 'user', 'super', 'power', 'magic', 'tiger',
])

function deleet(s: string): string {
  return [...s].map((c) => LEET[c] ?? c).join('')
}

function poolSize(pw: string) {
  const classes = {
    lower: /[a-z]/.test(pw),
    upper: /[A-Z]/.test(pw),
    digits: /\d/.test(pw),
    symbols: /[^a-zA-Z0-9]/.test(pw),
  }
  let size = 0
  if (classes.lower) size += 26
  if (classes.upper) size += 26
  if (classes.digits) size += 10
  if (classes.symbols) size += 33
  if (/[^\x20-\x7e]/.test(pw)) size += 100
  return { classes, size: Math.max(size, 1) }
}

/** Finds the longest run inside `pw` that also appears (forward or backward) in `ref`. */
function runsIn(pw: string, refs: string[], min: number): string[] {
  const lower = pw.toLowerCase()
  const found: string[] = []
  for (let i = 0; i < lower.length; i++) {
    let best = ''
    for (let j = i + min; j <= lower.length; j++) {
      const chunk = lower.slice(i, j)
      const rev = [...chunk].reverse().join('')
      if (refs.some((r) => r.includes(chunk) || r.includes(rev))) best = chunk
      else break
    }
    if (best) {
      found.push(best)
      i += best.length - 1
    }
  }
  return found
}

/**
 * A deliberately conservative, pattern-aware estimate (in the spirit of
 * zxcvbn): start from brute-force entropy, then replace every recognised
 * pattern by the much smaller cost of guessing that pattern.
 */
export function analyze(pw: string): Analysis {
  const { classes, size } = poolSize(pw)
  const length = [...pw].length
  const findings: Finding[] = []
  if (!length) return { bits: 0, score: 0, findings, classes, length }

  const lower = pw.toLowerCase()
  const plain = deleet(lower)
  const perChar = Math.log2(size)

  if (COMMON_PASSWORDS.has(lower) || COMMON_PASSWORDS.has(plain)) {
    findings.push({ kind: 'common', message: 'Il figure dans les listes de mots de passe les plus utilisés.' })
    return { bits: 6, score: 0, findings, classes, length }
  }

  // Each covered character is "free" except for the cost of the pattern itself.
  const covered = new Array<boolean>(length).fill(false)
  let patternBits = 0
  const cover = (needle: string, cost: number, source = lower) => {
    const at = source.indexOf(needle)
    if (at < 0) return false
    for (let i = at; i < at + needle.length; i++) covered[i] = true
    patternBits += cost
    return true
  }

  // Dictionary words (also through common leet substitutions), longest first.
  const words: string[] = []
  for (let len = Math.min(plain.length, 12); len >= 4; len--) {
    for (let i = 0; i + len <= plain.length; i++) {
      const sub = plain.slice(i, i + len)
      if (DICTIONARY.has(sub) && !covered.slice(i, i + len).some(Boolean)) {
        for (let k = i; k < i + len; k++) covered[k] = true
        patternBits += Math.log2(DICTIONARY.size) + 1
        words.push(sub)
      }
    }
  }
  if (words.length) {
    findings.push({
      kind: 'word',
      message: `Contient ${words.length > 1 ? 'des mots du dictionnaire' : 'un mot du dictionnaire'} (« ${words.join(' », « ')} »).`,
    })
  }

  for (const run of runsIn(pw, KEYBOARD_ROWS, 4)) {
    if (cover(run, 6)) findings.push({ kind: 'keyboard', message: `Suite de touches du clavier (« ${run} »).` })
  }
  for (const run of runsIn(pw, [SEQUENCES, DIGIT_SEQ], 3)) {
    if (cover(run, 4)) findings.push({ kind: 'sequence', message: `Suite logique (« ${run} »).` })
  }

  const repeat = /(.+?)\1{2,}/.exec(lower)
  if (repeat && repeat[0].length >= 3) {
    cover(repeat[0], Math.log2(size) * repeat[1].length + 3)
    findings.push({ kind: 'repeat', message: `Répétition (« ${repeat[0]} »).` })
  }

  const date = /(19[5-9]\d|20[0-3]\d)/.exec(pw)
  if (date) {
    cover(date[0], 7, pw)
    findings.push({ kind: 'date', message: `Ressemble à une année (« ${date[0]} »).` })
  }

  const free = covered.filter((c) => !c).length
  let bits = patternBits + free * perChar

  // "Word + digits + symbol" (Prenom92!, Soleil2024#…) is the first shape
  // cracking rules try: price the letters as a name-sized dictionary.
  const shape = /^([A-Za-z]{3,})(\d{0,4})([^A-Za-z0-9]{0,2})$/.exec(pw)
  if (shape) {
    const shapeBits = 20 + 1 + shape[2].length * Math.log2(10) + shape[3].length * 5
    if (shapeBits < bits) {
      bits = shapeBits
      findings.push({ kind: 'word', message: 'Structure prévisible : un mot suivi de chiffres ou d’un symbole.' })
    }
  }

  if (length < 12) findings.push({ kind: 'short', message: `Seulement ${length} caractères : visez au moins 14.` })
  const nClasses = Object.values(classes).filter(Boolean).length
  if (nClasses < 3 && length < 20) {
    findings.push({ kind: 'classes', message: 'Peu de types de caractères : ajoutez chiffres et symboles, ou allongez-le.' })
  }

  bits = Math.max(0, Math.min(bits, length * perChar))
  let score = scoreFromBits(bits)
  if (length < 10 && score > 2) score = 2
  return { bits, score, findings, classes, length }
}
