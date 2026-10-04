import { ArrowLeft } from 'lucide-react'
import { Link } from 'wouter'
import { PageShell } from '../components/layout'
import { useDocumentMeta } from '../lib/meta'

export default function NotFound() {
  useDocumentMeta('Page introuvable — Aetheris')
  return (
    <PageShell>
      <section className="container-page grid min-h-[60vh] place-items-center py-20 text-center">
        <div>
          <p className="font-mono text-sm text-muted">Erreur 404</p>
          <h1 className="mt-3 text-[2.4rem] font-semibold tracking-[-0.035em]">Cette page n’existe pas.</h1>
          <p className="mt-3 text-ink-2">Le lien est peut-être ancien, ou mal recopié.</p>
          <Link href="/" className="mt-8 inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-5 text-sm font-medium text-bg">
            <ArrowLeft className="size-4" /> Retour au générateur
          </Link>
        </div>
      </section>
    </PageShell>
  )
}
