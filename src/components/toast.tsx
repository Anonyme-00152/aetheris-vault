import { CheckCircle2, Info, TriangleAlert } from 'lucide-react'
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type Tone = 'success' | 'info' | 'error'
interface Toast {
  id: number
  message: string
  tone: Tone
}

interface ToastApi {
  toast: (message: string, tone?: Tone) => void
  /** Copies text, optionally wiping the clipboard after `clearAfter` seconds. */
  copy: (text: string, message?: string, clearAfter?: number) => Promise<boolean>
}

const Ctx = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const seq = useRef(0)
  const clearTimer = useRef<number | undefined>(undefined)

  const toast = useCallback((message: string, tone: Tone = 'success') => {
    const id = ++seq.current
    setItems((list) => [...list.slice(-2), { id, message, tone }])
    window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 2800)
  }, [])

  const copy = useCallback(
    async (text: string, message = 'Copié dans le presse-papiers', clearAfter = 0) => {
      try {
        await navigator.clipboard.writeText(text)
      } catch {
        toast('Copie impossible : autorisez l’accès au presse-papiers.', 'error')
        return false
      }
      window.clearTimeout(clearTimer.current)
      if (clearAfter > 0) {
        toast(`${message} · effacé dans ${clearAfter} s`)
        clearTimer.current = window.setTimeout(() => {
          // Only possible while the page has focus; silently ignored otherwise.
          navigator.clipboard.writeText('').catch(() => {})
        }, clearAfter * 1000)
      } else toast(message)
      return true
    },
    [toast],
  )

  return (
    <Ctx.Provider value={{ toast, copy }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-5 z-[100] flex flex-col items-center gap-2 px-4"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className="toast-in flex items-center gap-2.5 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-bg shadow-pop"
          >
            {t.tone === 'success' && <CheckCircle2 className="size-4 text-lime" />}
            {t.tone === 'info' && <Info className="size-4 text-lime" />}
            {t.tone === 'error' && <TriangleAlert className="size-4 text-s1" />}
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast outside ToastProvider')
  return ctx
}
