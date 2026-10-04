import { CalendarClock, Copy as CopyIcon, KeyRound, Loader2, ShieldAlert, ShieldCheck, Smartphone } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { Button, cx } from '../../components/ui'
import { OLD_AFTER_DAYS, type VaultHealth } from '../../lib/audit'
import { pwnedCount } from '../../lib/hibp'
import { relativeDate } from '../../lib/hooks'
import { SCORE_LABELS } from '../../lib/strength'
import type { Entry } from '../../lib/vault-types'
import { Avatar, useVault } from './shared'

type Tab = 'weak' | 'reused' | 'old' | 'no2fa' | 'pwned'

export function HealthView({ health, onOpen }: { health: VaultHealth; onOpen: (id: string) => void }) {
  const { data, editEntry } = useVault()
  const [tab, setTab] = useState<Tab>('weak')
  const [pwned, setPwned] = useState<Map<string, number> | null>(null)
  const [scan, setScan] = useState<{ done: number; total: number } | null>(null)
  const [scanError, setScanError] = useState('')
  const abort = useRef<AbortController | null>(null)

  const runScan = async () => {
    const withPw = data.entries.filter((e) => e.password)
    abort.current?.abort()
    const ctrl = new AbortController()
    abort.current = ctrl
    setScanError('')
    setScan({ done: 0, total: withPw.length })
    const out = new Map<string, number>()
    try {
      for (const [i, e] of withPw.entries()) {
        out.set(e.id, await pwnedCount(e.password, ctrl.signal))
        setScan({ done: i + 1, total: withPw.length })
      }
      setPwned(out)
      setTab('pwned')
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setScanError('Vérification interrompue : service injoignable.')
    } finally {
      setScan(null)
    }
  }

  const pwnedList = pwned ? data.entries.filter((e) => (pwned.get(e.id) ?? 0) > 0) : []
  const n = data.entries.length
  const tone = health.score >= 80 ? 'text-s4' : health.score >= 55 ? 'text-s2' : 'text-s0'
  const stroke = health.score >= 80 ? 'stroke-s4' : health.score >= 55 ? 'stroke-s2' : 'stroke-s0'

  const tabs: { id: Tab; label: string; icon: ReactNode; list: Entry[]; hidden?: boolean }[] = [
    { id: 'weak', label: 'Faibles', icon: <KeyRound className="size-4" />, list: health.weak },
    { id: 'reused', label: 'Réutilisés', icon: <CopyIcon className="size-4" />, list: health.reused },
    { id: 'old', label: `+ d’un an`, icon: <CalendarClock className="size-4" />, list: health.old },
    { id: 'no2fa', label: 'Sans 2FA', icon: <Smartphone className="size-4" />, list: health.no2fa },
    { id: 'pwned', label: 'Fuités', icon: <ShieldAlert className="size-4" />, list: pwnedList, hidden: !pwned },
  ]
  const current = tabs.find((t) => t.id === tab)!

  return (
    <div className="space-y-6">
      <div className="card grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center sm:p-7">
        <div className="relative mx-auto size-36">
          <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
            <circle cx="60" cy="60" r="52" fill="none" strokeWidth="10" className="stroke-line" />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              className={cx(stroke, 'transition-[stroke-dashoffset] duration-700')}
              strokeDasharray={326.7}
              strokeDashoffset={326.7 * (1 - health.score / 100)}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className={cx('text-4xl font-semibold tracking-tight tabular-nums', tone)}>{health.score}</p>
              <p className="text-[12px] text-muted">sur 100</p>
            </div>
          </div>
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {n === 0 ? 'Pas encore de diagnostic' : health.score >= 80 ? 'Excellente hygiène' : health.score >= 55 ? 'Peut mieux faire' : 'À corriger en priorité'}
          </h2>
          <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-2">
            {n === 0
              ? 'Ajoutez des identifiants pour obtenir un diagnostic.'
              : health.score >= 80
                ? 'Très bonne hygiène. Corrigez les derniers points pour viser 100.'
                : 'Quelques comptes méritent votre attention. Commencez par les mots de passe réutilisés : ce sont les plus risqués.'}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="soft" onClick={runScan} disabled={!!scan || n === 0}>
              {scan ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              {scan ? `Vérification ${scan.done}/${scan.total}…` : 'Rechercher dans les fuites connues'}
            </Button>
            <p className="max-w-xs text-[12px] leading-snug text-muted">
              Envoie seulement 5 caractères de l’empreinte SHA-1 de chaque mot de passe à Have I Been Pwned.
            </p>
          </div>
          {scanError && <p className="mt-2 text-[13px] text-s0">{scanError}</p>}
        </div>
      </div>

      <div role="tablist" aria-label="Catégories de problèmes" className={cx('grid grid-cols-2 gap-2', pwned ? 'sm:grid-cols-5' : 'sm:grid-cols-4')}>
        {tabs
          .filter((t) => !t.hidden)
          .map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cx(
                'rounded-xl border p-3.5 text-left transition-colors',
                tab === t.id ? 'border-accent/40 bg-accent-soft' : 'border-line bg-surface hover:border-line-strong',
              )}
            >
              <span className={cx('flex items-center gap-2 text-[13px]', tab === t.id ? 'text-accent' : 'text-muted')}>
                {t.icon} {t.label}
              </span>
              <span className={cx('mt-1 block text-2xl font-semibold tabular-nums', t.list.length && t.id !== 'no2fa' ? 'text-ink' : 'text-muted')}>
                {t.list.length}
              </span>
            </button>
          ))}
      </div>

      <div role="tabpanel" className="card divide-y divide-line">
        {current.list.length === 0 ? (
          <p className="flex items-center gap-2 px-5 py-8 text-[14px] text-muted">
            <ShieldCheck className="size-4 text-accent" /> Rien à signaler dans cette catégorie.
          </p>
        ) : (
          current.list.map((e) => {
            const h = health.byId.get(e.id)!
            const detail =
              tab === 'weak'
                ? `${SCORE_LABELS[h.score]} · ≈ ${Math.round(h.bits)} bits`
                : tab === 'reused'
                  ? `Partagé avec ${h.reused} autre${h.reused > 1 ? 's' : ''} compte${h.reused > 1 ? 's' : ''}`
                  : tab === 'old'
                    ? `Modifié ${relativeDate(e.passwordUpdatedAt)} (> ${OLD_AFTER_DAYS} jours)`
                    : tab === 'pwned'
                      ? `Vu ${(pwned?.get(e.id) ?? 0).toLocaleString('fr-FR')} fois dans des fuites`
                      : 'Activez la double authentification sur ce site'
            return (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <Avatar name={e.service} size="sm" />
                <button type="button" onClick={() => onOpen(e.id)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-[14.5px] font-medium hover:underline">{e.service}</span>
                  <span className="block truncate text-[12.5px] text-muted">{detail}</span>
                </button>
                <Button size="sm" onClick={() => editEntry(e)}>
                  Corriger
                </Button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
