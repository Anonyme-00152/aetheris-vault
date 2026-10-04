import {
  Activity,
  FolderClosed,
  Layers,
  Loader2,
  Lock,
  Paperclip,
  Plus,
  Settings,
  Star,
  Tag,
  TimerReset,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { PageShell } from '../../components/layout'
import { useToast } from '../../components/toast'
import { Button, Dialog, Kbd, cx } from '../../components/ui'
import { auditVault } from '../../lib/audit'
import { hasPendingPassword, takePendingPassword } from '../../lib/handoff'
import { useHotkeys } from '../../lib/hooks'
import { useDocumentMeta } from '../../lib/meta'
import { detectVault, lastUpdated, saveVault, type Session, type VaultPresence } from '../../lib/storage'
import { UNCATEGORIZED, type Entry, type VaultData } from '../../lib/vault-types'
import { EntryEditor } from './editor'
import { EntriesView, type ListFilter } from './entries'
import { FilesView } from './files'
import { HealthView } from './health'
import { LockScreen, type Opened } from './lock-screen'
import { SettingsView } from './settings'
import { VaultContext, useConfirmDialog, useSecretCopy, type VaultCtx } from './shared'

export default function VaultPage() {
  useDocumentMeta(
    'Coffre-fort — Aetheris',
    'Votre coffre-fort de mots de passe chiffré AES-256, stocké uniquement dans ce navigateur.',
  )
  const [presence, setPresence] = useState<VaultPresence | null>(null)
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [opened, setOpened] = useState<Opened | null>(null)
  const supported = typeof crypto !== 'undefined' && !!crypto.subtle && typeof indexedDB !== 'undefined'

  useEffect(() => {
    if (opened || !supported) return
    detectVault()
      .then(setPresence)
      .catch(() => setPresence('none'))
    lastUpdated().then(setUpdatedAt).catch(() => {})
  }, [opened, supported])

  return (
    <PageShell footer={false}>
      {!supported ? (
        <div className="container-page py-24 text-center">
          <h1 className="text-2xl font-semibold">Navigateur non compatible</h1>
          <p className="mt-2 text-muted">Le coffre nécessite Web Crypto et IndexedDB, disponibles uniquement en HTTPS.</p>
        </div>
      ) : opened ? (
        <VaultApp opened={opened} onLock={() => setOpened(null)} />
      ) : presence ? (
        <LockScreen presence={presence} updatedAt={updatedAt} onOpen={setOpened} />
      ) : (
        <div className="grid min-h-[60vh] place-items-center">
          <Loader2 className="size-6 animate-spin text-muted" aria-label="Chargement" />
        </div>
      )}
    </PageShell>
  )
}

type View = { kind: 'list'; filter: ListFilter } | { kind: 'health' } | { kind: 'files' } | { kind: 'settings' }

function sameView(a: View, b: View) {
  if (a.kind !== b.kind) return false
  if (a.kind === 'list' && b.kind === 'list') {
    if (a.filter.kind !== b.filter.kind) return false
    return a.filter.kind !== 'category' || (b.filter.kind === 'category' && a.filter.name === b.filter.name)
  }
  return true
}

function VaultApp({ opened, onLock }: { opened: Opened; onLock: () => void }) {
  const [session, setSession] = useState<Session>(opened.session)
  const [data, setData] = useState<VaultData>(opened.data)
  const dataRef = useRef(data)
  const sessionRef = useRef(session)
  const saveChain = useRef<Promise<void>>(Promise.resolve())
  const [view, setView] = useState<View>({ kind: 'list', filter: { kind: 'all' } })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editor, setEditor] = useState<{ open: boolean; entry: Entry | null; preset?: Partial<Entry> }>({ open: false, entry: null })
  const [newCategory, setNewCategory] = useState<string | null>(null)
  const [confirmEl, confirm] = useConfirmDialog()
  const { toast } = useToast()
  const copySecret = useSecretCopy(data.settings.clipboardClearSeconds)

  const update = useCallback(
    async (fn: (d: VaultData) => VaultData) => {
      const next = fn(dataRef.current)
      dataRef.current = next
      setData(next)
      // Writes are chained so they always land in order.
      saveChain.current = saveChain.current.then(() =>
        saveVault(sessionRef.current, next).catch(() => toast('Échec de l’enregistrement : stockage plein ou bloqué', 'error')),
      )
      await saveChain.current
    },
    [toast],
  )

  const replaceSession = useCallback((s: Session) => {
    sessionRef.current = s
    setSession(s)
  }, [])

  const lock = useCallback(() => {
    dataRef.current = { ...dataRef.current, entries: [] }
    onLock()
  }, [onLock])

  const editEntry = useCallback((entry: Entry | null, preset?: Partial<Entry>) => setEditor({ open: true, entry, preset }), [])

  // Generator → "Enregistrer au coffre"; migration notice.
  useEffect(() => {
    if (opened.migrated) toast('Coffre migré vers le nouveau format chiffré', 'info')
    if (hasPendingPassword()) {
      const pw = takePendingPassword()
      if (pw) setEditor({ open: true, entry: null, preset: { password: pw } })
    }
  }, [opened.migrated, toast])

  // Auto-lock after inactivity, checked even if the tab was asleep.
  useEffect(() => {
    const minutes = data.settings.autoLockMinutes
    if (!minutes) return
    let last = Date.now()
    const bump = () => (last = Date.now())
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }))
    const t = window.setInterval(() => {
      if (Date.now() - last > minutes * 60_000) lock()
    }, 5000)
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump))
      window.clearInterval(t)
    }
  }, [data.settings.autoLockMinutes, lock])

  useHotkeys({ l: lock })

  const health = useMemo(() => auditVault(data.entries), [data.entries])

  const ctx: VaultCtx = { session, data, update, replaceSession, lock, copySecret, confirm, editEntry }

  const counts = useMemo(() => {
    const byCat = new Map<string, number>()
    for (const e of data.entries) byCat.set(e.category, (byCat.get(e.category) ?? 0) + 1)
    return {
      all: data.entries.length,
      favorites: data.entries.filter((e) => e.favorite).length,
      totp: data.entries.filter((e) => e.totp).length,
      byCat,
    }
  }, [data.entries])

  const categories = useMemo(() => {
    const extra = counts.byCat.has(UNCATEGORIZED) ? [UNCATEGORIZED] : []
    return [...data.categories, ...extra]
  }, [data.categories, counts])

  const go = (v: View) => {
    setView(v)
    setSelectedId(null)
  }

  const removeCategory = async (name: string) => {
    const n = counts.byCat.get(name) ?? 0
    const ok = await confirm({
      title: `Supprimer la catégorie « ${name} » ?`,
      body: n ? `Ses ${n} entrée${n > 1 ? 's' : ''} passeront dans « ${UNCATEGORIZED} ». Rien n’est effacé.` : 'Elle est vide.',
      confirmLabel: 'Supprimer',
      danger: true,
    })
    if (!ok) return
    await update((v) => ({
      ...v,
      categories: v.categories.filter((c) => c !== name),
      entries: v.entries.map((e) => (e.category === name ? { ...e, category: UNCATEGORIZED } : e)),
    }))
    if (view.kind === 'list' && view.filter.kind === 'category' && view.filter.name === name) go({ kind: 'list', filter: { kind: 'all' } })
  }

  const addCategory = async () => {
    const name = newCategory?.trim()
    if (!name) return
    if (!data.categories.includes(name) && name !== UNCATEGORIZED) await update((v) => ({ ...v, categories: [...v.categories, name] }))
    setNewCategory(null)
    go({ kind: 'list', filter: { kind: 'category', name } })
  }

  const title =
    view.kind === 'health'
      ? 'Santé du coffre'
      : view.kind === 'files'
        ? 'Fichiers'
        : view.kind === 'settings'
          ? 'Paramètres'
          : view.filter.kind === 'all'
            ? 'Tous les éléments'
            : view.filter.kind === 'favorites'
              ? 'Favoris'
              : view.filter.kind === 'totp'
                ? 'Codes 2FA'
                : view.filter.name

  const nav: { view: View; label: string; icon: ReactNode; count?: number | string; tone?: string }[] = [
    { view: { kind: 'list', filter: { kind: 'all' } }, label: 'Tous les éléments', icon: <Layers />, count: counts.all },
    { view: { kind: 'list', filter: { kind: 'favorites' } }, label: 'Favoris', icon: <Star />, count: counts.favorites },
    { view: { kind: 'list', filter: { kind: 'totp' } }, label: 'Codes 2FA', icon: <TimerReset />, count: counts.totp },
  ]
  const tools: typeof nav = [
    {
      view: { kind: 'health' },
      label: 'Santé',
      icon: <Activity />,
      count: data.entries.length ? health.score : '—',
      tone: health.score >= 80 ? 'text-s4' : health.score >= 55 ? 'text-s2' : 'text-s0',
    },
    { view: { kind: 'files' }, label: 'Fichiers', icon: <Paperclip />, count: data.files.length },
    { view: { kind: 'settings' }, label: 'Paramètres', icon: <Settings /> },
  ]

  return (
    <VaultContext.Provider value={ctx}>
      <div className="container-page grid gap-8 pt-6 pb-16 lg:grid-cols-[232px_minmax(0,1fr)] lg:pt-8">
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:block" aria-label="Navigation du coffre">
          <div className="sticky top-24 space-y-6">
            <Button variant="primary" className="w-full" onClick={() => editEntry(null)}>
              <Plus className="size-4" /> Nouvelle entrée
            </Button>
            <NavGroup>
              {nav.map((n) => (
                <NavItem key={n.label} {...n} active={sameView(view, n.view)} onClick={() => go(n.view)} />
              ))}
            </NavGroup>
            <div>
              <div className="mb-1.5 flex items-center justify-between px-3">
                <p className="eyebrow">Catégories</p>
                <Button size="icon-sm" variant="ghost" aria-label="Nouvelle catégorie" className="-mr-2 size-7" onClick={() => setNewCategory('')}>
                  <Plus className="size-3.5" />
                </Button>
              </div>
              <NavGroup>
                {categories.map((c) => {
                  const v: View = { kind: 'list', filter: { kind: 'category', name: c } }
                  return (
                    <NavItem
                      key={c}
                      view={v}
                      label={c}
                      icon={c === UNCATEGORIZED ? <FolderClosed /> : <Tag />}
                      count={counts.byCat.get(c) ?? 0}
                      active={sameView(view, v)}
                      onClick={() => go(v)}
                      onRemove={c === UNCATEGORIZED ? undefined : () => removeCategory(c)}
                    />
                  )
                })}
              </NavGroup>
            </div>
            <div>
              <p className="eyebrow mb-1.5 px-3">Outils</p>
              <NavGroup>
                {tools.map((n) => (
                  <NavItem key={n.label} {...n} active={sameView(view, n.view)} onClick={() => go(n.view)} />
                ))}
              </NavGroup>
            </div>
            <div className="border-t border-line pt-4">
              <Button variant="ghost" className="w-full justify-start" onClick={lock}>
                <Lock className="size-4" /> Verrouiller <span className="ml-auto"><Kbd>L</Kbd></span>
              </Button>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-6 flex items-center gap-3">
            <h1 className="min-w-0 flex-1 truncate text-[1.6rem] font-semibold tracking-[-0.03em] sm:text-[1.9rem]">{title}</h1>
            <Button variant="primary" className="lg:hidden" onClick={() => editEntry(null)} aria-label="Nouvelle entrée">
              <Plus className="size-4" /> <span className="max-sm:sr-only">Nouvelle</span>
            </Button>
            <Button className="lg:hidden" size="icon" onClick={lock} aria-label="Verrouiller">
              <Lock className="size-4" />
            </Button>
          </div>

          {/* Mobile navigation */}
          <nav aria-label="Navigation du coffre" className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden">
            {[...nav, ...categories.map((c) => ({ view: { kind: 'list', filter: { kind: 'category', name: c } } as View, label: c, icon: <Tag />, count: counts.byCat.get(c) ?? 0 })), ...tools].map((n) => (
              <button
                key={n.label}
                type="button"
                onClick={() => go(n.view)}
                aria-current={sameView(view, n.view) || undefined}
                className={cx(
                  'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium whitespace-nowrap [&>svg]:size-3.5',
                  sameView(view, n.view) ? 'border-ink bg-ink text-bg' : 'border-line bg-surface text-ink-2',
                )}
              >
                {n.icon}
                {n.label}
              </button>
            ))}
            <button type="button" onClick={() => setNewCategory('')} className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-line-strong px-3 py-1.5 text-[13px] text-muted">
              <Plus className="size-3.5" /> Catégorie
            </button>
          </nav>

          {view.kind === 'list' && (
            <EntriesView filter={view.filter} health={health} title={title} selectedId={selectedId} onSelect={setSelectedId} />
          )}
          {view.kind === 'health' && (
            <HealthView
              health={health}
              onOpen={(id) => {
                setView({ kind: 'list', filter: { kind: 'all' } })
                setSelectedId(id)
              }}
            />
          )}
          {view.kind === 'files' && <FilesView />}
          {view.kind === 'settings' && <SettingsView />}
        </div>
      </div>

      <EntryEditor
        open={editor.open}
        entry={editor.entry}
        preset={editor.preset}
        onClose={() => setEditor((e) => ({ ...e, open: false }))}
        onSaved={(e) => {
          setEditor((x) => ({ ...x, open: false }))
          toast(editor.entry ? 'Modifications enregistrées' : 'Ajouté au coffre')
          if (view.kind !== 'list') setView({ kind: 'list', filter: { kind: 'all' } })
          setSelectedId(e.id)
        }}
      />

      <Dialog
        open={newCategory !== null}
        onClose={() => setNewCategory(null)}
        title="Nouvelle catégorie"
        size="sm"
        footer={
          <>
            <Button onClick={() => setNewCategory(null)}>Annuler</Button>
            <Button variant="primary" onClick={addCategory} disabled={!newCategory?.trim()}>
              Créer
            </Button>
          </>
        }
      >
        <input
          className="input"
          aria-label="Nom de la catégorie"
          placeholder="Jeux, Administratif, Famille…"
          value={newCategory ?? ''}
          maxLength={40}
          onChange={(e) => setNewCategory(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCategory()}
          autoFocus
        />
      </Dialog>

      {confirmEl}
    </VaultContext.Provider>
  )
}

function NavGroup({ children }: { children: ReactNode }) {
  return <ul className="space-y-0.5">{children}</ul>
}

function NavItem({
  label,
  icon,
  count,
  tone,
  active,
  onClick,
  onRemove,
}: {
  view: View
  label: string
  icon: ReactNode
  count?: number | string
  tone?: string
  active: boolean
  onClick: () => void
  onRemove?: () => void
}) {
  return (
    <li className="group relative">
      <button
        type="button"
        onClick={onClick}
        aria-current={active || undefined}
        className={cx(
          'flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left text-[14px] transition-colors [&>svg]:size-4 [&>svg]:shrink-0',
          active ? 'bg-surface font-medium text-ink shadow-[var(--shadow-card)]' : 'text-ink-2 hover:bg-surface/70 hover:text-ink',
        )}
      >
        {icon}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {count !== undefined && (
          <span className={cx('font-mono text-[12px] tabular-nums group-hover:opacity-0', onRemove ? '' : 'group-hover:opacity-100', tone ?? 'text-muted')}>{count}</span>
        )}
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Supprimer la catégorie ${label}`}
          className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted opacity-0 group-hover:opacity-100 hover:bg-surface-2 hover:text-s0 focus-visible:opacity-100"
        >
          <X className="size-3.5" />
        </button>
      )}
    </li>
  )
}

