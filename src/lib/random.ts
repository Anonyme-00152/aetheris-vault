/**
 * Cryptographically secure, unbiased random helpers.
 *
 * `crypto.getRandomValues` gives uniform 32-bit words. Taking `n % max`
 * directly favours the low values whenever 2^32 is not a multiple of `max`
 * (modulo bias), so we reject the words that fall in the incomplete last
 * bucket and draw again.
 */

const BUF_SIZE = 256
const buf = new Uint32Array(BUF_SIZE)
let cursor = BUF_SIZE

function nextUint32(): number {
  if (cursor >= BUF_SIZE) {
    crypto.getRandomValues(buf)
    cursor = 0
  }
  return buf[cursor++]
}

/** Uniform integer in [0, max). */
export function randomInt(max: number): number {
  if (!Number.isInteger(max) || max <= 0 || max > 2 ** 32) {
    throw new RangeError(`randomInt: invalid max ${max}`)
  }
  const limit = 2 ** 32 - (2 ** 32 % max)
  let n: number
  do n = nextUint32()
  while (n >= limit)
  return n % max
}

export function pick<T>(items: ArrayLike<T>): T {
  return items[randomInt(items.length)]
}

/** Fisher–Yates shuffle, in place. */
export function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

export function randomId(): string {
  return crypto.randomUUID()
}
