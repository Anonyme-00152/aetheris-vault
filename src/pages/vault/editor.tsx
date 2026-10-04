import { Eye, EyeOff, Star, Wand2 } from 'lucide-react'
import { useEffect, useId, useMemo, useState, type FormEvent } from 'react'
import { StrengthMeter } from '../../components/strength-meter'
import { Button, Dialog, Field, cx } from '../../components/ui'
import { DEFAULT_PASSWORD, generatePassword } from '../../lib/generator'
import { analyze } from '../../lib/strength'
import { UNCATEGORIZED, normalizeEntry, type Entry } from '../../lib/vault-types'
import { safeParseTotp, useVault } from './shared'

interface Draft {
  service: string
  username: string
  password: string
  url: string
  category: string
  notes: string
  totp: string
  favorite: boolean
}

const blank: Draft = { service: '', username: '', password: '', url: '', category: UNCATEGORIZED, notes: '', totp: '', favorite: false }

export function EntryEditor({
  open,
  entry,
  preset,
  onClose,
  onSaved,
}: {
  open: boolean
  entry: Entry | null
  preset?: Partial<Entry>
  onClose: () => void
  onSaved: (e: Entry) => void
}) {
  const { data, update } = useVault()
  const [d, setD] = useState<Draft>(blank)
  const [shown, setShown] = useState(false)
  const [error, setError] = useState('')
  const ids = { service: useId(), user: useId(), pw: useId(), url: useId(), cat: useId(), totp: useId(), notes: useId() }

  useEffect(() => {
    if (!open) return
    setError('')
    setShown(!entry && !!preset?.password)
    setD(entry ? { ...entry } : { ...blank, ...preset, category: preset?.category ?? UNCATEGORIZED } as Draft)
  }, [open, entry, preset])

  const a = useMemo(() => analyze(d.password), [d.password])
  const totpOk = !d.totp.trim() || !!safeParseTotp(d.totp)
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!d.service.trim()) return setError('Donnez un nom à cette entrée.')
    if (!totpOk) return setError('La clé 2FA n’est pas valide (base32 ou lien otpauth://).')
    const now = Date.now()
    const saved: Entry = entry
      ? {
          ...entry,
          ...d,
          service: d.service.trim(),
          updatedAt: now,
          passwordUpdatedAt: d.password !== entry.password ? now : entry.passwordUpdatedAt,
        }
      : normalizeEntry({ ...d, service: d.service.trim(), createdAt: now, updatedAt: now, passwordUpdatedAt: now })
    await update((v) => ({
      ...v,
      entries: entry ? v.entries.map((x) => (x.id === entry.id ? saved : x)) : [saved, ...v.entries],
    }))
    onSaved(saved)
  }

  const categories = [...data.categories, UNCATEGORIZED]

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={entry ? 'Modifier l’entrée' : 'Nouvelle entrée'}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" type="submit" form="entry-form">
            {entry ? 'Enregistrer' : 'Ajouter au coffre'}
          </Button>
        </>
      }
    >
      <form id="entry-form" onSubmit={submit} className="space-y-4" noValidate>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Field label="Nom du service" htmlFor={ids.service}>
              <input id={ids.service} className="input" value={d.service} onChange={(e) => set({ service: e.target.value })} placeholder="GitHub, Banque, Netflix…" autoFocus autoComplete="off" />
            </Field>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => set({ favorite: !d.favorite })}
            aria-pressed={d.favorite}
            aria-label={d.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            className="mb-0.5"
          >
            <Star className={cx('size-[18px]', d.favorite && 'fill-s2 text-s2')} />
          </Button>
        </div>
        <Field label="Identifiant ou e-mail" htmlFor={ids.user}>
          <input id={ids.user} className="input font-mono text-[14px]" value={d.username} onChange={(e) => set({ username: e.target.value })} autoComplete="off" spellCheck={false} />
        </Field>
        <Field label="Mot de passe" htmlFor={ids.pw}>
          <div className="relative">
            <input
              id={ids.pw}
              type={shown ? 'text' : 'password'}
              className="input pr-[5.5rem] font-mono text-[14px]"
              value={d.password}
              onChange={(e) => set({ password: e.target.value })}
              autoComplete="new-password"
              spellCheck={false}
            />
            <div className="absolute top-1.5 right-1.5 flex">
              <Button size="icon-sm" variant="ghost" onClick={() => setShown((s) => !s)} aria-label={shown ? 'Masquer' : 'Afficher'}>
                {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                title="Générer un mot de passe de 20 caractères"
                aria-label="Générer un mot de passe"
                onClick={() => {
                  set({ password: generatePassword(DEFAULT_PASSWORD).value })
                  setShown(true)
                }}
              >
                <Wand2 className="size-4 text-accent" />
              </Button>
            </div>
          </div>
          {d.password && <StrengthMeter score={a.score} className="pt-1" />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Site web" htmlFor={ids.url}>
            <input id={ids.url} className="input" value={d.url} onChange={(e) => set({ url: e.target.value })} placeholder="github.com" autoComplete="off" inputMode="url" />
          </Field>
          <Field label="Catégorie" htmlFor={ids.cat}>
            <select id={ids.cat} className="input appearance-none" value={d.category} onChange={(e) => set({ category: e.target.value })}>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field
          label="Clé de double authentification (facultatif)"
          htmlFor={ids.totp}
          hint="La clé texte affichée par le site sous le QR code, ou un lien otpauth://"
          error={!totpOk ? 'Clé non reconnue.' : undefined}
        >
          <input id={ids.totp} className="input font-mono text-[13px]" value={d.totp} onChange={(e) => set({ totp: e.target.value })} placeholder="JBSW Y3DP EHPK 3PXP" autoComplete="off" spellCheck={false} />
        </Field>
        <Field label="Notes" htmlFor={ids.notes}>
          <textarea id={ids.notes} className="input min-h-20 resize-y" value={d.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Questions secrètes, codes de secours…" />
        </Field>
        {error && (
          <p role="alert" className="text-[13.5px] font-medium text-s0">
            {error}
          </p>
        )}
      </form>
    </Dialog>
  )
}
