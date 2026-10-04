import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

/** Non-sensitive UI preferences only (never secrets). */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? { ...initial, ...JSON.parse(raw) } : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* private mode */
    }
  }, [key, value])
  return [value, setValue] as const
}

export type Theme = 'light' | 'dark'

const listeners = new Set<() => void>()
function readTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

export function useTheme() {
  const theme = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    readTheme,
    () => 'light' as Theme,
  )
  const setTheme = useCallback((t: Theme) => {
    document.documentElement.dataset.theme = t
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#0e1215' : '#f5f5f0')
    try {
      localStorage.setItem('aetheris:theme', t)
    } catch {
      /* ignore */
    }
    listeners.forEach((l) => l())
  }, [])
  return [theme, setTheme] as const
}

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = matchMedia(query)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => matchMedia(query).matches,
    () => false,
  )
}

/** Re-renders every `ms` milliseconds. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms)
    return () => window.clearInterval(t)
  }, [ms])
  return now
}

/** Global keyboard shortcuts that stay quiet while the user is typing. */
export function useHotkeys(map: Record<string, (e: KeyboardEvent) => void>, enabled = true) {
  const ref = useRef(map)
  useEffect(() => {
    ref.current = map
  })
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (t.closest('input, textarea, select, [contenteditable="true"], dialog[open]')) return
      const fn = ref.current[e.key.toLowerCase()]
      if (fn) {
        e.preventDefault()
        fn(e)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}

export function formatBytes(b: number) {
  if (b < 1024) return `${b} o`
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(b < 10240 ? 1 : 0)} Ko`
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} Mo`
  return `${(b / 1024 ** 3).toFixed(1)} Go`
}

export function relativeDate(ts: number, now = Date.now()) {
  const d = Math.round((now - ts) / 86_400_000)
  if (d <= 0) return 'aujourd’hui'
  if (d === 1) return 'hier'
  if (d < 31) return `il y a ${d} jours`
  const m = Math.round(d / 30.4)
  if (m < 12) return `il y a ${m} mois`
  const y = Math.round(d / 365)
  return `il y a ${y} an${y > 1 ? 's' : ''}`
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
