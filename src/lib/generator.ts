import { pick, randomInt } from './random'
import { WORDS } from './wordlist-fr'

export const CHARSETS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  digits: '0123456789',
  symbols: '!#$%&*+-=?@^_~.:;()[]{}',
} as const

export type CharsetKey = keyof typeof CHARSETS

/** Characters that are easy to confuse when read aloud or copied by hand. */
export const AMBIGUOUS = 'Il1|O0oB8S5Z2'

export type GeneratorMode = 'password' | 'passphrase' | 'pin'

export interface PasswordOptions {
  length: number
  upper: boolean
  lower: boolean
  digits: boolean
  symbols: boolean
  avoidAmbiguous: boolean
  /** Extra characters the user wants removed from every set. */
  exclude: string
}

export interface PassphraseOptions {
  words: number
  separator: '-' | '.' | '_' | ' ' | 'digit'
  capitalize: boolean
  addNumber: boolean
}

export interface PinOptions {
  length: number
}

export interface Generated {
  value: string
  /** Exact entropy of the generation process, in bits. */
  bits: number
}

export const DEFAULT_PASSWORD: PasswordOptions = {
  length: 20,
  upper: true,
  lower: true,
  digits: true,
  symbols: true,
  avoidAmbiguous: false,
  exclude: '',
}

export const DEFAULT_PASSPHRASE: PassphraseOptions = {
  words: 6,
  separator: '-',
  capitalize: true,
  addNumber: true,
}

export const DEFAULT_PIN: PinOptions = { length: 6 }

export const PASSWORD_LIMITS = { min: 4, max: 128 }
export const PASSPHRASE_LIMITS = { min: 3, max: 12 }
export const PIN_LIMITS = { min: 4, max: 12 }

/** The character classes actually in play, after exclusions. */
export function activeSets(o: PasswordOptions): string[] {
  const removed = new Set((o.avoidAmbiguous ? AMBIGUOUS : '') + o.exclude)
  return (Object.keys(CHARSETS) as CharsetKey[])
    .filter((k) => o[k])
    .map((k) => [...CHARSETS[k]].filter((c) => !removed.has(c)).join(''))
    .filter((s) => s.length > 0)
}

/**
 * Uniform over every string of `length` that contains at least one character
 * of each active class. Rejection sampling keeps the distribution exactly
 * uniform, so the entropy reported by `passwordBits` is the real one.
 */
export function generatePassword(o: PasswordOptions): Generated {
  const sets = activeSets(o)
  if (!sets.length) return { value: '', bits: 0 }
  const pool = sets.join('')
  const length = Math.max(o.length, sets.length)
  for (let attempt = 0; attempt < 10_000; attempt++) {
    let out = ''
    for (let i = 0; i < length; i++) out += pool[randomInt(pool.length)]
    if (sets.every((s) => [...out].some((c) => s.includes(c)))) {
      return { value: out, bits: passwordBits(sets.map((s) => s.length), length) }
    }
  }
  throw new Error('generatePassword: could not satisfy the constraints')
}

/**
 * log2 of the number of strings of length L over the union of the sets that
 * contain at least one character from every set (inclusion–exclusion).
 */
export function passwordBits(setSizes: number[], length: number): number {
  const k = setSizes.length
  if (!k || length <= 0) return 0
  let count = 0n
  for (let mask = 0; mask < 1 << k; mask++) {
    let size = 0
    let excluded = 0
    for (let i = 0; i < k; i++) {
      if (mask & (1 << i)) excluded++
      else size += setSizes[i]
    }
    const term = BigInt(size) ** BigInt(length)
    count += excluded % 2 ? -term : term
  }
  return log2Big(count)
}

function log2Big(n: bigint): number {
  if (n <= 0n) return 0
  const hex = n.toString(16)
  const lead = parseInt(hex.slice(0, 13), 16)
  return Math.log2(lead) + 4 * (hex.length - Math.min(13, hex.length))
}

export function generatePassphrase(o: PassphraseOptions): Generated {
  const n = o.words
  const words = Array.from({ length: n }, () => {
    const w = pick(WORDS)
    return o.capitalize ? w[0].toUpperCase() + w.slice(1) : w
  })
  let bits = n * Math.log2(WORDS.length)
  if (o.addNumber) {
    const i = randomInt(n)
    words[i] += String(randomInt(10))
    bits += Math.log2(10) + Math.log2(n)
  }
  let value: string
  if (o.separator === 'digit') {
    value = words.reduce((acc, w, i) => (i ? acc + String(randomInt(10)) + w : w), '')
    bits += (n - 1) * Math.log2(10)
  } else {
    value = words.join(o.separator)
  }
  return { value, bits }
}

export function generatePin(o: PinOptions): Generated {
  let value = ''
  for (let i = 0; i < o.length; i++) value += String(randomInt(10))
  return { value, bits: o.length * Math.log2(10) }
}

export type CharKind = 'upper' | 'lower' | 'digit' | 'symbol'

export function charKind(c: string): CharKind {
  if (c >= '0' && c <= '9') return 'digit'
  if (c >= 'A' && c <= 'Z') return 'upper'
  if (c >= 'a' && c <= 'z') return 'lower'
  return 'symbol'
}
