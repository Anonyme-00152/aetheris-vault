import { Download, Eye, FileText, Loader2, Pencil, Trash2, UploadCloud } from 'lucide-react'
import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { useToast } from '../../components/toast'
import { Button, Dialog, cx } from '../../components/ui'
import { downloadBlob, formatBytes, relativeDate } from '../../lib/hooks'
import { putFile, readFile, removeFile, storageEstimate } from '../../lib/storage'
import type { FileMeta } from '../../lib/vault-types'
import { colorFor, useVault } from './shared'

const MAX_FILE = 50 * 1024 * 1024

function ext(name: string) {
  const m = /\.([a-z0-9]{1,5})$/i.exec(name)
  return m ? m[1].toUpperCase() : 'FICHIER'
}

export function FilesView() {
  const { session, data, update, confirm } = useVault()
  const { toast } = useToast()
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(0)
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null)
  const [preview, setPreview] = useState<{ meta: FileMeta; url: string } | null>(null)
  const [renaming, setRenaming] = useState<FileMeta | null>(null)
  const [newName, setNewName] = useState('')
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    storageEstimate().then(setUsage)
  }, [data.files.length])

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview.url)
  }, [preview])

  const add = async (list: FileList | File[]) => {
    const files = [...list]
    if (!files.length) return
    setBusy(files.length)
    const added: FileMeta[] = []
    for (const f of files) {
      if (f.size > MAX_FILE) {
        toast(`« ${f.name} » dépasse 50 Mo`, 'error')
        continue
      }
      try {
        added.push(await putFile(session, f))
      } catch {
        toast(`Stockage plein : « ${f.name} » n’a pas été ajouté`, 'error')
        break
      } finally {
        setBusy((b) => b - 1)
      }
    }
    setBusy(0)
    if (added.length) {
      await update((v) => ({ ...v, files: [...added, ...v.files] }))
      toast(added.length > 1 ? `${added.length} fichiers chiffrés et ajoutés` : 'Fichier chiffré et ajouté')
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDrag(false)
    if (e.dataTransfer.files.length) add(e.dataTransfer.files)
  }

  const open = async (f: FileMeta) => {
    try {
      const blob = await readFile(session, f)
      if (f.type.startsWith('image/')) setPreview({ meta: f, url: URL.createObjectURL(blob) })
      else downloadBlob(blob, f.name)
    } catch {
      toast('Fichier illisible', 'error')
    }
  }

  const download = async (f: FileMeta) => {
    try {
      downloadBlob(await readFile(session, f), f.name)
    } catch {
      toast('Fichier illisible', 'error')
    }
  }

  const remove = async (f: FileMeta) => {
    const ok = await confirm({
      title: `Supprimer « ${f.name} » ?`,
      body: 'Le fichier chiffré sera effacé de ce navigateur. Cette action est définitive.',
      confirmLabel: 'Supprimer',
      danger: true,
    })
    if (!ok) return
    await update((v) => ({ ...v, files: v.files.filter((x) => x.id !== f.id) }))
    await removeFile(f.id)
    toast('Fichier supprimé')
  }

  const rename = async () => {
    const name = newName.trim()
    if (!renaming || !name) return
    await update((v) => ({ ...v, files: v.files.map((x) => (x.id === renaming.id ? { ...x, name } : x)) }))
    setRenaming(null)
  }

  const total = data.files.reduce((s, f) => s + f.size, 0)

  return (
    <div className="space-y-6">
      <div
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), input.current?.click())}
        onDragEnter={(e) => (e.preventDefault(), setDrag(true))}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={cx(
          'flex flex-col items-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          drag ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface hover:border-accent/60',
        )}
      >
        <span className="grid size-12 place-items-center rounded-2xl bg-ink text-lime">
          {busy ? <Loader2 className="size-5 animate-spin" /> : <UploadCloud className="size-5" />}
        </span>
        <p className="mt-4 font-semibold">{busy ? 'Chiffrement en cours…' : 'Déposez des fichiers ici'}</p>
        <p className="mt-1 max-w-sm text-[13.5px] text-muted">
          ou cliquez pour parcourir. Chaque fichier est chiffré en AES-256-GCM avant d’être stocké. 50 Mo maximum par
          fichier.
        </p>
        <input ref={input} type="file" multiple className="hidden" onChange={(e) => (e.target.files && add(e.target.files), (e.target.value = ''))} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-muted">
        <span>
          {data.files.length} fichier{data.files.length > 1 ? 's' : ''} · {formatBytes(total)}
        </span>
        {usage && usage.quota > 0 && (
          <span>
            Espace du navigateur : {formatBytes(usage.usage)} utilisés sur {formatBytes(usage.quota)}
          </span>
        )}
      </div>

      {data.files.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.files.map((f) => (
            <li key={f.id} className="card flex flex-col overflow-hidden">
              <button type="button" onClick={() => open(f)} className="flex items-center gap-3 p-4 text-left">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl font-mono text-[10.5px] font-semibold text-white" style={{ background: colorFor(ext(f.name)) }}>
                  {f.type.startsWith('image/') ? <Eye className="size-4" /> : ext(f.name).slice(0, 4)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-medium" title={f.name}>
                    {f.name}
                  </span>
                  <span className="block text-[12px] text-muted">
                    {formatBytes(f.size)} · {relativeDate(f.addedAt)}
                  </span>
                </span>
              </button>
              <div className="mt-auto flex border-t border-line">
                <FileAction label="Télécharger" onClick={() => download(f)}>
                  <Download className="size-4" />
                </FileAction>
                <FileAction
                  label="Renommer"
                  onClick={() => {
                    setRenaming(f)
                    setNewName(f.name)
                  }}
                >
                  <Pencil className="size-4" />
                </FileAction>
                <FileAction label="Supprimer" onClick={() => remove(f)} danger>
                  <Trash2 className="size-4" />
                </FileAction>
              </div>
            </li>
          ))}
        </ul>
      )}
      {data.files.length === 0 && (
        <p className="flex items-center justify-center gap-2 py-6 text-[14px] text-muted">
          <FileText className="size-4" /> Pièces d’identité, codes de secours, contrats : rangez-les ici.
        </p>
      )}

      <Dialog open={!!preview} onClose={() => setPreview(null)} title={preview?.meta.name} size="lg">
        {preview && <img src={preview.url} alt={preview.meta.name} className="mx-auto max-h-[65vh] rounded-xl" />}
      </Dialog>

      <Dialog
        open={!!renaming}
        onClose={() => setRenaming(null)}
        title="Renommer le fichier"
        size="sm"
        footer={
          <>
            <Button onClick={() => setRenaming(null)}>Annuler</Button>
            <Button variant="primary" onClick={rename}>
              Renommer
            </Button>
          </>
        }
      >
        <input
          className="input"
          value={newName}
          aria-label="Nouveau nom"
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && rename()}
          autoFocus
        />
      </Dialog>
    </div>
  )
}

function FileAction({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cx('grid h-10 flex-1 place-items-center text-muted transition-colors hover:bg-surface-2', danger ? 'hover:text-s0' : 'hover:text-ink')}
    >
      {children}
    </button>
  )
}
