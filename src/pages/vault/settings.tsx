import { AlertTriangle, Download, FileJson, KeyRound, Loader2, Trash2, Upload } from 'lucide-react'
import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { StrengthMeter } from '../../components/strength-meter'
import { useToast } from '../../components/toast'
import { Button, Dialog, Field } from '../../components/ui'
import { entriesFromCsv } from '../../lib/csv'
import { downloadBlob } from '../../lib/hooks'
import {
  WrongPasswordError,
  changeMasterPassword,
  destroyVault,
  exportEncrypted,
  exportPlain,
  parseJsonImport,
  storeImportedFiles,
  type ImportPayload,
} from '../../lib/storage'
import { analyze } from '../../lib/strength'
import { UNCATEGORIZED, type Entry } from '../../lib/vault-types'
import { useVault } from './shared'

function Section({ title, description, children }: { title: string; description: ReactNode; children: ReactNode }) {
  return (
    <section className="card grid gap-5 p-5 sm:p-6 lg:grid-cols-[0.8fr_1.2fr]">
      <div>
        <h2 className="font-semibold tracking-tight">{title}</h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

const stamp = () => new Date().toISOString().slice(0, 10)

export function SettingsView() {
  const { session, data, update, replaceSession, confirm, lock } = useVault()
  const { toast } = useToast()
  const ids = { lock: useId(), clip: useId() }

  return (
    <div className="space-y-5">
      <Section title="Verrouillage et presse-papiers" description="Limitez la durée pendant laquelle vos secrets restent accessibles sur cet écran.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Verrouillage automatique" htmlFor={ids.lock} hint="Après une période sans activité.">
            <select
              id={ids.lock}
              className="input appearance-none"
              value={data.settings.autoLockMinutes}
              onChange={(e) => update((v) => ({ ...v, settings: { ...v.settings, autoLockMinutes: Number(e.target.value) } }))}
            >
              <option value={1}>1 minute</option>
              <option value={5}>5 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={60}>1 heure</option>
              <option value={0}>Jamais</option>
            </select>
          </Field>
          <Field label="Effacer le presse-papiers" htmlFor={ids.clip} hint="Après la copie d’un secret.">
            <select
              id={ids.clip}
              className="input appearance-none"
              value={data.settings.clipboardClearSeconds}
              onChange={(e) => update((v) => ({ ...v, settings: { ...v.settings, clipboardClearSeconds: Number(e.target.value) } }))}
            >
              <option value={15}>15 secondes</option>
              <option value={30}>30 secondes</option>
              <option value={60}>1 minute</option>
              <option value={0}>Jamais</option>
            </select>
          </Field>
        </div>
      </Section>

      <ChangePassword
        onChanged={async (cur, next) => {
          const s = await changeMasterPassword(session, cur, next, data)
          replaceSession(s)
        }}
      />

      <Section
        title="Sauvegarde"
        description="Le coffre n’existe que dans ce navigateur. Exportez une sauvegarde chiffrée pour le transférer ou le mettre à l’abri."
      >
        <div className="space-y-3">
          <Button
            variant="primary"
            className="w-full justify-start sm:w-auto"
            onClick={async () => {
              downloadBlob(await exportEncrypted(session, data), `aetheris-sauvegarde-${stamp()}.aetheris.json`)
              toast('Sauvegarde chiffrée téléchargée')
            }}
          >
            <Download className="size-4" /> Exporter une sauvegarde chiffrée
          </Button>
          <p className="text-[12.5px] text-muted">Protégée par votre mot de passe maître actuel. Fichiers inclus.</p>
          <div className="border-t border-line pt-3">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3"
              onClick={async () => {
                const ok = await confirm({
                  title: 'Exporter sans chiffrement ?',
                  body: (
                    <>
                      Le fichier contiendra <b>tous vos mots de passe en clair</b>. N’importe qui y ayant accès pourra
                      les lire. Utilisez-le uniquement pour migrer vers un autre outil, puis supprimez-le.
                    </>
                  ),
                  confirmLabel: 'Exporter en clair',
                  danger: true,
                })
                if (ok) downloadBlob(await exportPlain(session, data), `aetheris-export-NON-CHIFFRE-${stamp()}.json`)
              }}
            >
              <FileJson className="size-4" /> Export non chiffré (JSON)
            </Button>
          </div>
        </div>
      </Section>

      <ImportSection
        onImport={async (payload) => {
          const files = await storeImportedFiles(session, payload.files)
          const existing = new Set(data.entries.map((e) => `${e.service}\u0000${e.username}\u0000${e.password}`))
          const fresh = payload.data.entries.filter((e) => !existing.has(`${e.service}\u0000${e.username}\u0000${e.password}`))
          await update((v) => ({
            ...v,
            categories: [...new Set([...v.categories, ...payload.data.categories, ...fresh.map((e) => e.category)])].filter((c) => c !== UNCATEGORIZED),
            entries: [...fresh.map((e) => ({ ...e, id: crypto.randomUUID() })), ...v.entries],
            files: [...files, ...v.files],
          }))
          return { added: fresh.length, skipped: payload.data.entries.length - fresh.length, files: files.length }
        }}
      />

      <Section title="Zone sensible" description="Supprime définitivement le coffre et ses fichiers de ce navigateur.">
        <Button
          variant="danger"
          onClick={async () => {
            const ok = await confirm({
              title: 'Supprimer définitivement le coffre ?',
              body: 'Tous les identifiants et fichiers de ce navigateur seront effacés. Sans sauvegarde, ils seront perdus pour toujours.',
              confirmLabel: 'Tout supprimer',
              danger: true,
            })
            if (!ok) return
            await destroyVault()
            lock()
            location.reload()
          }}
        >
          <Trash2 className="size-4" /> Supprimer le coffre
        </Button>
      </Section>
    </div>
  )
}

function ChangePassword({ onChanged }: { onChanged: (cur: string, next: string) => Promise<void> }) {
  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [next2, setNext2] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { toast } = useToast()
  const ids = { a: useId(), b: useId(), c: useId() }
  const a = analyze(next)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (next.length < 10 || a.score < 2) return setError('Nouveau mot de passe trop faible (10 caractères minimum, score « Moyen » au moins).')
    if (next !== next2) return setError('Les deux saisies ne correspondent pas.')
    setBusy(true)
    try {
      await onChanged(cur, next)
      setCur('')
      setNext('')
      setNext2('')
      toast('Mot de passe maître modifié')
    } catch (err) {
      setError(err instanceof WrongPasswordError ? 'Mot de passe actuel incorrect.' : 'La modification a échoué.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section
      title="Mot de passe maître"
      description="Seule la clé de données est ré-enveloppée : l’opération est instantanée, quel que soit le volume du coffre. Pensez à refaire une sauvegarde ensuite."
    >
      <form onSubmit={submit} className="space-y-3" noValidate>
        <Field label="Mot de passe actuel" htmlFor={ids.a}>
          <input id={ids.a} type="password" className="input font-mono" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nouveau" htmlFor={ids.b}>
            <input id={ids.b} type="password" className="input font-mono" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
          </Field>
          <Field label="Confirmation" htmlFor={ids.c}>
            <input id={ids.c} type="password" className="input font-mono" value={next2} onChange={(e) => setNext2(e.target.value)} autoComplete="new-password" />
          </Field>
        </div>
        {next && <StrengthMeter score={a.score} />}
        {error && (
          <p role="alert" className="text-[13.5px] font-medium text-s0">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy || !cur || !next}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
          Changer le mot de passe maître
        </Button>
      </form>
    </Section>
  )
}

function ImportSection({ onImport }: { onImport: (p: ImportPayload) => Promise<{ added: number; skipped: number; files: number }> }) {
  const input = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{ name: string; open: (pw: string) => Promise<ImportPayload> } | null>(null)
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { toast } = useToast()

  const finish = async (payload: ImportPayload) => {
    const r = await onImport(payload)
    toast(`${r.added} entrée${r.added > 1 ? 's' : ''} importée${r.added > 1 ? 's' : ''}${r.skipped ? ` · ${r.skipped} doublon${r.skipped > 1 ? 's' : ''} ignoré${r.skipped > 1 ? 's' : ''}` : ''}${r.files ? ` · ${r.files} fichier${r.files > 1 ? 's' : ''}` : ''}`)
  }

  const onFile = async (file: File) => {
    try {
      const text = await file.text()
      if (/\.csv$/i.test(file.name) || file.type === 'text/csv') {
        const entries: Entry[] = entriesFromCsv(text)
        await finish({ data: { categories: [], entries, files: [], settings: { autoLockMinutes: 5, clipboardClearSeconds: 30 } }, files: [] })
        return
      }
      const parsed = parseJsonImport(text)
      if (parsed.kind === 'plain') await finish(parsed.payload)
      else {
        setPw('')
        setError('')
        setPending({ name: file.name, open: parsed.open })
      }
    } catch (e) {
      toast((e as Error).message || 'Fichier illisible', 'error')
    }
  }

  const openEncrypted = async (e: FormEvent) => {
    e.preventDefault()
    if (!pending) return
    setBusy(true)
    setError('')
    try {
      await finish(await pending.open(pw))
      setPending(null)
    } catch (err) {
      setError(err instanceof WrongPasswordError ? 'Mot de passe incorrect pour cette sauvegarde.' : 'Sauvegarde illisible.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section
      title="Importer"
      description={
        <>
          Sauvegarde Aetheris (chiffrée ou non), ou export CSV de Chrome, Edge, Firefox, Safari, Bitwarden, 1Password.
          Les doublons exacts sont ignorés.
        </>
      }
    >
      <Button onClick={() => input.current?.click()}>
        <Upload className="size-4" /> Choisir un fichier
      </Button>
      <input
        ref={input}
        type="file"
        accept=".json,.csv,application/json,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ''
        }}
      />
      <p className="mt-3 flex gap-2 text-[12.5px] leading-relaxed text-muted">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-s1" />
        Un export CSV de navigateur n’est pas chiffré : supprimez-le (et videz la corbeille) une fois l’import terminé.
      </p>

      <Dialog
        open={!!pending}
        onClose={() => setPending(null)}
        title="Sauvegarde chiffrée"
        description={pending?.name}
        size="sm"
        footer={
          <>
            <Button onClick={() => setPending(null)}>Annuler</Button>
            <Button variant="primary" type="submit" form="import-form" disabled={busy || !pw}>
              {busy && <Loader2 className="size-4 animate-spin" />} Importer
            </Button>
          </>
        }
      >
        <form id="import-form" onSubmit={openEncrypted}>
          <Field label="Mot de passe maître de cette sauvegarde" error={error}>
            <input type="password" className="input font-mono" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus aria-label="Mot de passe de la sauvegarde" />
          </Field>
        </form>
      </Dialog>
    </Section>
  )
}
