/**
 * In-memory hand-off from the generator to the vault ("save this password").
 * Lives only in this tab's JS heap: never in the URL, storage or history.
 */
let pending: string | null = null

export function setPendingPassword(pw: string) {
  pending = pw
}

export function takePendingPassword(): string | null {
  const p = pending
  pending = null
  return p
}

export function hasPendingPassword() {
  return pending !== null
}

/** Session history of generated secrets, shared across page navigations. */
export interface HistoryItem {
  id: number
  value: string
  bits: number
  mode: string
  at: number
}

let seq = 0
export const sessionHistory: HistoryItem[] = []

export function pushHistory(value: string, bits: number, mode: string) {
  if (sessionHistory[0]?.value === value) return
  sessionHistory.unshift({ id: ++seq, value, bits, mode, at: Date.now() })
  if (sessionHistory.length > 12) sessionHistory.pop()
}
