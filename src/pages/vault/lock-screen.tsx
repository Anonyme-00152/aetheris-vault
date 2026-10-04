import { ArrowLeft, Eye, EyeOff, Loader2, Lock, LockOpen, ShieldCheck, Upload } from 'lucide-react'
import { useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { StrengthMeter } from '../../components/strength-meter'
import { Button, Field } from '../../components/ui'
import { relativeDate } from '../../lib/hooks'
import {
  WrongPasswordError,
  createVault,
  parseJsonImport,
  saveVault,
  storeImportedFiles,
  type ImportPayload,
  type Session,
  type VaultPresence,
  unlockVault,
} from '../../lib/storage'
import { analyze } from '../../lib/strength'
import type { VaultData } from '../../lib/vault-types'

export type Opened = { session: Session; data: VaultData; migrated?: boolean }

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoFocus,
  autoComplete,
  invalid,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoFocus?: boolean
  autoComplete: string
  invalid?: boolean
}) {
  const [shown, setShown] = useState(false)
  return (
    <div className="relative">
      <input
        id={id}
        type={shown ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        spellCheck={false}
        aria-invalid={invalid || undefined}
        className="input h-12 pr-12 font-mono"
      />
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute top-2 right-2"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
      >
        {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </Button>
    </div>
  )
}

export function LockScreen({
  presence,
  updatedAt,
  onOpen,
}: {
  presence: VaultPresence
  updatedAt: number | null
  onOpen: (o: Opened) => void
}) {
  const [mode, setMode] = useState<'main' | 'restore'>('main')
  return (
    <div className="container-page grid min-h-[calc(100dvh-4rem)] place-items-center py-10">
      <div className="w-full max-w-[440px] animate-rise">
        {mode === 'restore' ? (
          <Restore onBack={() => setMode('main')} onOpen={onOpen} />
        ) : presence === 'none' ? (
          <Setup onOpen={onOpen} onRestore={() => setMode('restore')} />
        ) : (
          <Unlock legacy={presence === 'legacy'} updatedAt={updatedAt} onOpen={onOpen} />
        )}
        <p className="mt-6 flex items-center justify-center gap-2 text-center text-[12.5px] text-muted">
          <ShieldCheck className="size-3.5" />
          Chiffré sur cet appareil · AES-256-GCM · rien n’est envoyé
        </p>
      </div>
    </div>
  )
}

function Header({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="mb-7 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-ink text-lime">{icon}</span>
      <h1 className="mt-5 text-[1.65rem] font-semibold tracking-[-0.03em]">{title}</h1>
      <p className="mx-auto mt-2 max-w-sm text-[14.5px] leading-relaxed text-muted">{children}</p>
    </div>
  )
}

function Setup({ onOpen, onRestore }: { onOpen: (o: Opened) => void; onRestore: () => void }) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [ack, setAck] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const id1 = useId()
  const id2 = useId()
  const a = useMemo(() => analyze(pw), [pw])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (pw.length < 10) return setError('Au moins 10 caractères. Une phrase de 4 ou 5 mots est idéale.')
    if (a.score < 2) return setError('Trop facile à deviner. Allongez-le ou utilisez une phrase de passe.')
    if (pw !== pw2) return setError('Les deux saisies ne correspondent pas.')
    if (!ack) return setError('Cochez la case pour confirmer que vous avez compris.')
    setBusy(true)
    try {
      onOpen(await createVault(pw))
    } catch {
      setError('Impossible d’écrire dans le stockage du navigateur (navigation privée ?).')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="card shadow-pop p-6 sm:p-8" noValidate>
      <Header icon={<Lock className="size-6" />} title="Créez votre coffre">
        Choisissez un mot de passe maître. Il chiffre tout, n’est stocké nulle part et ne peut pas être réinitialisé.
      </Header>
      <div className="space-y-4">
        <Field label="Mot de passe maître" htmlFor={id1}>
          <PasswordInput id={id1} value={pw} onChange={setPw} autoFocus autoComplete="new-password" placeholder="Une phrase que vous seul connaissez" />
          <StrengthMeter score={a.score} empty={!pw} className="pt-1" />
        </Field>
        <Field label="Confirmation" htmlFor={id2}>
          <PasswordInput id={id2} value={pw2} onChange={setPw2} autoComplete="new-password" placeholder="Retapez-le" />
        </Field>
        <label className="flex items-start gap-3 rounded-xl bg-s2/10 p-3.5 text-[13.5px] leading-relaxed text-ink-2">
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-1 size-4 accent-[var(--accent)]" />
          <span>
            <b className="text-ink">J’ai noté ce mot de passe en lieu sûr.</b> Si je l’oublie, mes données seront
            définitivement perdues.
          </span>
        </label>
        {error && (
          <p role="alert" className="text-[13.5px] font-medium text-s0">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
          {busy ? 'Chiffrement…' : 'Créer le coffre'}
        </Button>
      </div>
      <div className="mt-6 border-t border-line pt-5 text-center">
        <button type="button" onClick={onRestore} className="inline-flex items-center gap-2 text-[13.5px] font-medium text-accent hover:underline">
          <Upload className="size-4" /> Restaurer une sauvegarde
        </button>
      </div>
    </form>
  )
}

function Unlock({ legacy, updatedAt, onOpen }: { legacy: boolean; updatedAt: number | null; onOpen: (o: Opened) => void }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [shake, setShake] = useState(0)
  const id = useId()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!pw) return
    setBusy(true)
    setError('')
    try {
      onOpen(await unlockVault(pw))
    } catch (err) {
      setBusy(false)
      setShake((s) => s + 1)
      setError(err instanceof WrongPasswordError ? 'Mot de passe incorrect.' : 'Le coffre n’a pas pu être lu.')
    }
  }

  return (
    <form onSubmit={submit} className="card shadow-pop p-6 sm:p-8">
      <Header icon={<LockOpen className="size-6" />} title="Déverrouiller">
        {legacy
          ? 'Coffre de l’ancienne version détecté. Il sera migré vers le nouveau format, plus robuste, dès son ouverture.'
          : updatedAt
            ? `Entrez votre mot de passe maître. Dernière modification ${relativeDate(updatedAt)}.`
            : 'Entrez votre mot de passe maître.'}
      </Header>
      <div key={shake} className={shake ? 'animate-[shake_0.35s]' : undefined}>
        <Field label="Mot de passe maître" htmlFor={id} error={error}>
          <PasswordInput id={id} value={pw} onChange={setPw} autoFocus autoComplete="current-password" invalid={!!error} />
        </Field>
      </div>
      <Button type="submit" variant="primary" size="lg" className="mt-5 w-full" disabled={busy || !pw}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <LockOpen className="size-4" />}
        {busy ? 'Déchiffrement…' : 'Déverrouiller'}
      </Button>
    </form>
  )
}

function Restore({ onBack, onOpen }: { onBack: () => void; onOpen: (o: Opened) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const id = useId()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!file) return setError('Choisissez un fichier de sauvegarde.')
    setBusy(true)
    setError('')
    try {
      const parsed = parseJsonImport(await file.text())
      if (parsed.kind !== 'encrypted') throw new Error('Ce fichier n’est pas une sauvegarde chiffrée. Créez un coffre puis importez-le depuis les paramètres.')
      const payload: ImportPayload = await parsed.open(pw)
      // Same password protects the restored vault.
      const { session } = await createVault(pw, { ...payload.data, files: [] })
      const files = await storeImportedFiles(session, payload.files)
      const data = { ...payload.data, files }
      await saveVault(session, data)
      onOpen({ session, data })
    } catch (err) {
      setBusy(false)
      setError(err instanceof WrongPasswordError ? 'Mot de passe incorrect pour cette sauvegarde.' : (err as Error).message || 'Fichier illisible.')
    }
  }

  return (
    <form onSubmit={submit} className="card shadow-pop p-6 sm:p-8">
      <button type="button" onClick={onBack} className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Retour
      </button>
      <Header icon={<Upload className="size-6" />} title="Restaurer une sauvegarde">
        Sélectionnez un fichier <code className="font-mono text-[13px]">.aetheris.json</code> et le mot de passe maître avec lequel il a été exporté.
      </Header>
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex w-full items-center gap-3 rounded-xl border border-dashed border-line-strong px-4 py-4 text-left text-[14px] hover:border-accent"
        >
          <Upload className="size-5 text-muted" />
          <span className="min-w-0 flex-1 truncate">{file ? file.name : 'Choisir un fichier…'}</span>
        </button>
        <input ref={input} type="file" accept=".json,application/json" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <Field label="Mot de passe de la sauvegarde" htmlFor={id} error={error}>
          <PasswordInput id={id} value={pw} onChange={setPw} autoComplete="current-password" />
        </Field>
        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy || !file || !pw}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          Restaurer
        </Button>
      </div>
    </form>
  )
}
