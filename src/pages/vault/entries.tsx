import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Star,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { SecretText } from '../../components/secret-text'
import { StrengthMeter, scoreBg } from '../../components/strength-meter'
import { Button, cx } from '../../components/ui'
import type { VaultHealth } from '../../lib/audit'
import { relativeDate, useHotkeys, useMediaQuery } from '../../lib/hooks'
import type { Entry } from '../../lib/vault-types'
import { Avatar, TotpCode, hostnameOf, safeHref, useVault } from './shared'

export type ListFilter = { kind: 'all' } | { kind: 'favorites' } | { kind: 'totp' } | { kind: 'category'; name: string }

type Sort = 'recent' | 'name' | 'weakest'

export function EntriesView({
  filter,
  health,
  title,
  selectedId,
  onSelect,
}: {
  filter: ListFilter
  health: VaultHealth
  title: string
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const { data, editEntry } = useVault()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('recent')
  const searchRef = useRef<HTMLInputElement>(null)
  const wide = useMediaQuery('(min-width: 1280px)')

  useHotkeys({ '/': () => searchRef.current?.focus(), n: () => editEntry(null) })

  const list = useMemo(() => {
    let l = data.entries
    if (filter.kind === 'favorites') l = l.filter((e) => e.favorite)
    if (filter.kind === 'totp') l = l.filter((e) => e.totp)
    if (filter.kind === 'category') l = l.filter((e) => e.category === filter.name)
    const q = query.trim().toLowerCase()
    if (q) l = l.filter((e) => `${e.service} ${e.username} ${e.url} ${e.category} ${e.notes}`.toLowerCase().includes(q))
    const sorted = [...l]
    if (sort === 'name') sorted.sort((a, b) => a.service.localeCompare(b.service, 'fr', { sensitivity: 'base' }))
    else if (sort === 'weakest') sorted.sort((a, b) => (health.byId.get(a.id)?.bits ?? 0) - (health.byId.get(b.id)?.bits ?? 0))
    else sorted.sort((a, b) => b.updatedAt - a.updatedAt)
    return sorted
  }, [data.entries, filter, query, sort, health])

  const selected = data.entries.find((e) => e.id === selectedId) ?? null
  useEffect(() => {
    if (wide && !selected && list.length) onSelect(list[0].id)
  }, [wide, selected, list, onSelect])

  // On narrow screens the detail replaces the list.
  if (!wide && selected) {
    return (
      <div>
        <Button variant="ghost" size="sm" onClick={() => onSelect(null)} className="-ml-2 mb-3">
          <ArrowLeft className="size-4" /> {title}
        </Button>
        <EntryDetail entry={selected} health={health} />
      </div>
    )
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <section aria-label={title} className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
              aria-label="Rechercher dans le coffre"
              className="input h-10 pl-10"
            />
            <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-line px-1.5 font-mono text-[11px] text-muted sm:block">/</kbd>
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            aria-label="Trier"
            className="input h-10 w-auto appearance-none pr-8 text-[13.5px]"
          >
            <option value="recent">Récents</option>
            <option value="name">A → Z</option>
            <option value="weakest">Plus faibles</option>
          </select>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <h2 className="text-[13px] font-medium text-muted">
            {title} · {list.length}
          </h2>
        </div>

        {list.length === 0 ? (
          <Empty hasEntries={data.entries.length > 0} searching={!!query} onAdd={() => editEntry(null, filter.kind === 'category' ? { category: filter.name } : filter.kind === 'favorites' ? { favorite: true } : undefined)} />
        ) : (
          <ul className="mt-2 space-y-1.5">
            {list.map((e) => {
              const h = health.byId.get(e.id)
              const active = e.id === selectedId
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(e.id)}
                    aria-current={active || undefined}
                    className={cx(
                      'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
                      active ? 'border-accent/40 bg-accent-soft' : 'border-transparent hover:bg-surface',
                    )}
                  >
                    <Avatar name={e.service} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[14.5px] font-medium">{e.service}</span>
                        {e.favorite && <Star className="size-3.5 shrink-0 fill-s2 text-s2" aria-label="Favori" />}
                      </span>
                      <span className="block truncate text-[13px] text-muted">{e.username || hostnameOf(e.url) || e.category}</span>
                    </span>
                    {e.totp && <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[10.5px] text-muted">2FA</span>}
                    {h?.reused ? <ShieldAlert className="size-4 shrink-0 text-s1" aria-label="Réutilisé" /> : null}
                    {e.password && h && <span className={cx('size-2 shrink-0 rounded-full', scoreBg(h.score))} aria-hidden />}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {wide && (
        <div className="min-w-0">
          <div className="sticky top-24">
            {selected ? (
              <EntryDetail entry={selected} health={health} />
            ) : (
              <div className="grid h-80 place-items-center rounded-2xl border border-dashed border-line-strong text-[14px] text-muted">
                Sélectionnez une entrée
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Empty({ hasEntries, searching, onAdd }: { hasEntries: boolean; searching: boolean; onAdd: () => void }) {
  return (
    <div className="mt-3 rounded-2xl border border-dashed border-line-strong px-6 py-14 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-surface-2 text-muted">
        <KeyRound className="size-5" />
      </span>
      <h3 className="mt-4 font-semibold">{searching ? 'Aucun résultat' : hasEntries ? 'Rien ici pour l’instant' : 'Votre coffre est vide'}</h3>
      <p className="mx-auto mt-1.5 max-w-xs text-[14px] text-muted">
        {searching
          ? 'Essayez un autre mot-clé.'
          : 'Ajoutez un premier identifiant, ou importez ceux de votre navigateur depuis les paramètres.'}
      </p>
      {!searching && (
        <Button variant="primary" className="mt-5" onClick={onAdd}>
          <Plus className="size-4" /> Ajouter une entrée
        </Button>
      )}
    </div>
  )
}

export function EntryDetail({ entry, health }: { entry: Entry; health: VaultHealth }) {
  const { update, copySecret, confirm, editEntry } = useVault()
  const [shown, setShown] = useState(false)
  const h = health.byId.get(entry.id)
  const href = entry.url ? safeHref(entry.url) : null

  useEffect(() => setShown(false), [entry.id])

  const remove = async () => {
    const ok = await confirm({
      title: `Supprimer « ${entry.service} » ?`,
      body: 'L’identifiant et son mot de passe seront effacés de ce coffre. Cette action est définitive.',
      confirmLabel: 'Supprimer',
      danger: true,
    })
    if (ok) await update((v) => ({ ...v, entries: v.entries.filter((e) => e.id !== entry.id) }))
  }

  const toggleFavorite = () =>
    update((v) => ({ ...v, entries: v.entries.map((e) => (e.id === entry.id ? { ...e, favorite: !e.favorite } : e)) }))

  return (
    <article className="card overflow-hidden" aria-label={entry.service}>
      <header className="flex items-center gap-4 border-b border-line p-5">
        <Avatar name={entry.service} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-semibold tracking-tight">{entry.service}</h2>
          <p className="text-[13px] text-muted">{entry.category}</p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={toggleFavorite} aria-pressed={entry.favorite} aria-label={entry.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
            <Star className={cx('size-[18px]', entry.favorite && 'fill-s2 text-s2')} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => editEntry(entry)} aria-label="Modifier">
            <Pencil className="size-[18px]" />
          </Button>
          <Button variant="ghost" size="icon" onClick={remove} aria-label="Supprimer" className="hover:text-s0">
            <Trash2 className="size-[18px]" />
          </Button>
        </div>
      </header>

      <dl className="divide-y divide-line">
        <Row label="Identifiant">
          <span className="min-w-0 flex-1 truncate font-mono text-[14px]">{entry.username || <span className="text-muted">—</span>}</span>
          {entry.username && (
            <Button size="icon-sm" variant="ghost" aria-label="Copier l’identifiant" onClick={() => copySecret(entry.username, 'Identifiant copié')}>
              <Copy className="size-4" />
            </Button>
          )}
        </Row>

        <Row label="Mot de passe">
          <div className="min-w-0 flex-1">
            {entry.password ? (
              shown ? (
                <SecretText value={entry.password} className="text-[14.5px]" />
              ) : (
                <span className="font-mono text-[14.5px] tracking-[0.2em] text-ink-2">••••••••••••</span>
              )
            ) : (
              <span className="text-muted">—</span>
            )}
          </div>
          {entry.password && (
            <>
              <Button size="icon-sm" variant="ghost" aria-label={shown ? 'Masquer' : 'Afficher'} onClick={() => setShown((s) => !s)}>
                {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
              <Button size="icon-sm" variant="ghost" aria-label="Copier le mot de passe" onClick={() => copySecret(entry.password, 'Mot de passe copié')}>
                <Copy className="size-4" />
              </Button>
            </>
          )}
        </Row>

        {entry.password && h && (
          <div className="space-y-2.5 px-5 py-4">
            <StrengthMeter score={h.score} />
            <p className="text-[12.5px] text-muted">
              ≈ {Math.round(h.bits)} bits · modifié {relativeDate(entry.passwordUpdatedAt)}
            </p>
            {h.reused > 0 && (
              <p className="flex gap-2 rounded-lg bg-s1/10 px-3 py-2 text-[13px]">
                <ShieldAlert className="mt-0.5 size-4 shrink-0 text-s1" />
                Utilisé aussi sur {h.reused} autre{h.reused > 1 ? 's' : ''} compte{h.reused > 1 ? 's' : ''}. Si l’un fuit,
                tous sont exposés.
              </p>
            )}
          </div>
        )}

        {entry.totp && (
          <Row label="Code 2FA">
            <div className="flex-1">
              <TotpCode secret={entry.totp} onCopy={(c) => copySecret(c, 'Code copié')} />
            </div>
          </Row>
        )}

        {entry.url && (
          <Row label="Site web">
            <span className="min-w-0 flex-1 truncate text-[14px]">{hostnameOf(entry.url)}</span>
            {href && (
              <a
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={`Ouvrir ${hostnameOf(entry.url)}`}
                className="grid size-8 place-items-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink"
              >
                <ExternalLink className="size-4" />
              </a>
            )}
          </Row>
        )}

        {entry.notes && (
          <div className="px-5 py-4">
            <dt className="text-[12px] font-medium text-muted">Notes</dt>
            <dd className="mt-1.5 text-[14px] leading-relaxed whitespace-pre-wrap text-ink-2">{entry.notes}</dd>
          </div>
        )}
      </dl>
      <footer className="border-t border-line bg-surface-2/60 px-5 py-3 text-[12px] text-muted">
        Créé {relativeDate(entry.createdAt)} · mis à jour {relativeDate(entry.updatedAt)}
      </footer>
    </article>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="px-5 py-3.5">
      <dt className="text-[12px] font-medium text-muted">{label}</dt>
      <dd className="mt-1 flex min-h-8 items-center gap-1">{children}</dd>
    </div>
  )
}
