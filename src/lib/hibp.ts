import { sha1Hex } from './crypto'

/**
 * Have I Been Pwned "range" API (k-anonymity): only the first 5 hex characters
 * of the SHA-1 hash leave the device. The service answers with every suffix
 * sharing that prefix, and the match is done here. `Add-Padding` makes every
 * response the same size so the prefix cannot be guessed from the traffic.
 */
export async function pwnedCount(password: string, signal?: AbortSignal): Promise<number> {
  const hash = await sha1Hex(password)
  const prefix = hash.slice(0, 5)
  const suffix = hash.slice(5)
  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { 'Add-Padding': 'true' },
    signal,
    referrerPolicy: 'no-referrer',
  })
  if (!res.ok) throw new Error(`HIBP a répondu ${res.status}`)
  const body = await res.text()
  for (const line of body.split('\n')) {
    const [s, count] = line.trim().split(':')
    if (s === suffix) return Number(count)
  }
  return 0
}
