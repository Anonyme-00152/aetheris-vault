import { Copy } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useToast } from '../../components/toast'
import { Button, Dialog, cx } from '../../components/ui'
import { useNow } from '../../lib/hooks'
import type { Session } from '../../lib/storage'
import { parseTotp, totpAt, type TotpConfig } from '../../lib/totp'
import type { Entry, VaultData } from '../../lib/vault-types'

export interface VaultCtx {
  session: Session
  data: VaultData
  update: (fn: (d: VaultData) => VaultData) => Promise<void>
  replaceSession: (s: Session) => void
  lock: () => void
  copySecret: (text: string, message?: string) => void
  confirm: (opts: ConfirmOptions) => Promise<boolean>
  editEntry: (entry: Entry | null, preset?: Partial<Entry>) => void
}

export const VaultContext = createContext<VaultCtx | null>(null)

export function useVault() {
  const ctx = useContext(VaultContext)
  if (!ctx) throw new Error('useVault outside VaultContext')
  return ctx
}

export function useSecretCopy(clearAfter: number) {
  const { copy } = useToast()
  return useCallback((text: string, message?: string) => void copy(text, message, clearAfter), [copy, clearAfter])
}

/* ------------------------------------------------------------ confirm */

export interface ConfirmOptions {
  title: string
  body: ReactNode
  confirmLabel?: string
  danger?: boolean
}

export function useConfirmDialog() {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null)
  const ask = useCallback(
    (opts: ConfirmOptions) => new Promise<boolean>((resolve) => setState({ ...opts, resolve })),
    [],
  )
  const close = (v: boolean) => {
    state?.resolve(v)
    setState(null)
  }
  const element = (
    <Dialog
      open={!!state}
      onClose={() => close(false)}
      title={state?.title}
      size="sm"
      footer={
        <>
          <Button onClick={() => close(false)}>Annuler</Button>
          <Button variant={state?.danger ? 'danger' : 'primary'} onClick={() => close(true)} autoFocus>
            {state?.confirmLabel ?? 'Confirmer'}
          </Button>
        </>
      }
    >
      <div className="text-[14.5px] leading-relaxed text-ink-2">{state?.body}</div>
    </Dialog>
  )
  return [element, ask] as const
}

/* ------------------------------------------------------------- avatar */

const AVATAR_COLORS = ['#101318', '#0a6b53', '#2f5b8f', '#7a4fa3', '#b4540f', '#3f7d3a', '#8a6a12', '#3d5560', '#9a3f5f']

export function colorFor(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (s.charCodeAt(i) + ((h << 5) - h)) | 0
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.trim().slice(0, 2) || '?'
  return (
    <span
      aria-hidden
      className={cx(
        'grid shrink-0 place-items-center font-semibold text-white capitalize',
        size === 'sm' && 'size-8 rounded-lg text-[12px]',
        size === 'md' && 'size-10 rounded-xl text-[14px]',
        size === 'lg' && 'size-14 rounded-2xl text-lg',
      )}
      style={{ background: colorFor(name.toLowerCase()) }}
    >
      {initials}
    </span>
  )
}

/* --------------------------------------------------------------- totp */

export function safeParseTotp(s: string): TotpConfig | null {
  if (!s.trim()) return null
  try {
    return parseTotp(s)
  } catch {
    return null
  }
}

export function TotpCode({ secret, onCopy, compact }: { secret: string; onCopy?: (code: string) => void; compact?: boolean }) {
  const cfg = useMemo(() => safeParseTotp(secret), [secret])
  const now = useNow(500)
  const [code, setCode] = useState('')
  const step = cfg ? Math.floor(now / 1000 / cfg.period) : 0
  const last = useRef(-1)

  useEffect(() => {
    if (!cfg || last.current === step) return
    last.current = step
    let alive = true
    totpAt(cfg, now).then((c) => alive && setCode(c))
    return () => {
      alive = false
    }
  }, [cfg, step, now])

  if (!cfg) return <span className="text-[13px] text-s0">Clé 2FA invalide</span>
  const remaining = cfg.period - ((now / 1000) % cfg.period)
  const pct = remaining / cfg.period
  const urgent = remaining < 6
  const half = Math.ceil(code.length / 2)

  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 36 36" className={cx('-rotate-90', compact ? 'size-6' : 'size-9')} aria-hidden>
        <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3.5" className="stroke-line" />
        <circle
          cx="18"
          cy="18"
          r="15"
          fill="none"
          strokeWidth="3.5"
          strokeLinecap="round"
          className={urgent ? 'stroke-s1' : 'stroke-accent'}
          strokeDasharray={94.25}
          strokeDashoffset={94.25 * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.5s linear' }}
        />
      </svg>
      <span className={cx('font-mono font-semibold tracking-[0.12em] tabular-nums', compact ? 'text-[15px]' : 'text-[22px]', urgent && 'text-s1')}>
        {code.slice(0, half)} {code.slice(half)}
      </span>
      {!compact && (
        <span className="font-mono text-[12px] text-muted tabular-nums" aria-label={`${Math.ceil(remaining)} secondes restantes`}>
          {Math.ceil(remaining)} s
        </span>
      )}
      {onCopy && (
        <Button size="icon-sm" variant="ghost" aria-label="Copier le code" onClick={() => onCopy(code)} className="ml-auto">
          <Copy className="size-4" />
        </Button>
      )}
    </div>
  )
}

export function hostnameOf(url: string) {
  if (!url) return ''
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function safeHref(url: string) {
  const href = /^https?:\/\//i.test(url) ? url : `https://${url}`
  try {
    const u = new URL(href)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null
  } catch {
    return null
  }
}
