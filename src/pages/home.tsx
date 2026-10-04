import {
  ArrowRight,
  Cpu,
  DatabaseZap,
  FileDown,
  Fingerprint,
  HardDrive,
  KeyRound,
  Lock,
  Plus,
  Radar,
  ShieldCheck,
  Smartphone,
  TimerReset,
  WifiOff,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'wouter'
import { Generator } from '../components/generator'
import { PageShell } from '../components/layout'
import { cx } from '../components/ui'
import { useDocumentMeta } from '../lib/meta'

export default function Home() {
  useDocumentMeta(
    'Aetheris — Générateur et coffre-fort de mots de passe 100 % local',
    'Générez des mots de passe incassables et rangez-les dans un coffre chiffré AES-256 qui ne quitte jamais votre navigateur. Gratuit, sans compte, open source.',
  )
  return (
    <PageShell>
      <Hero />
      <Proof />
      <HowItWorks />
      <Features />
      <Practices />
      <Faq />
      <Cta />
    </PageShell>
  )
}

function Hero() {
  return (
    <section className="relative">
      <div aria-hidden className="bg-dots pointer-events-none absolute inset-x-0 top-0 h-[560px] [mask-image:radial-gradient(70%_60%_at_50%_0%,#000,transparent)] opacity-70" />
      <div className="container-page relative grid gap-8 pt-8 pb-16 sm:pt-14 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14 lg:pt-20">
        <div className="animate-rise lg:pt-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[12.5px] font-medium text-ink-2 shadow-[var(--shadow-card)]">
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-50" />
              <span className="relative size-2 rounded-full bg-accent" />
            </span>
            Tout se passe sur votre appareil
          </p>
          <h1 className="mt-6 text-[2.6rem] leading-[1.02] font-semibold tracking-[-0.035em] text-balance sm:text-[3.4rem] lg:text-[3.9rem]">
            Des mots de passe que personne ne devinera.
          </h1>
          <p className="mt-5 max-w-[34rem] text-[16px] leading-relaxed sm:text-[17px] text-ink-2 text-pretty">
            Aetheris génère des secrets avec l’aléa cryptographique de votre navigateur, puis les range dans un coffre
            chiffré qui n’existe que chez vous. Pas de compte, pas de serveur, rien à faire confiance.
          </p>
          <ul className="mt-8 hidden max-w-md gap-3 text-[14.5px] text-ink-2 lg:grid">
            <Bullet icon={<Cpu className="size-4" />}>
              Aléa <code className="font-mono text-[13px]">crypto.getRandomValues</code>, sans biais statistique
            </Bullet>
            <Bullet icon={<WifiOff className="size-4" />}>Aucune requête réseau : vérifiable dans l’onglet Réseau</Bullet>
            <Bullet icon={<Lock className="size-4" />}>Coffre AES-256-GCM, clé dérivée de votre mot de passe maître</Bullet>
          </ul>
          <div className="mt-9 hidden flex-wrap items-center gap-3 lg:flex">
            <Link
              href="/coffre"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-ink px-5 text-[15px] font-medium text-bg transition-transform active:scale-[0.97]"
            >
              Créer mon coffre
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/verifier"
              className="inline-flex h-12 items-center gap-2 rounded-xl px-4 text-[15px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
            >
              Tester un mot de passe
            </Link>
          </div>
        </div>
        <div className="animate-rise [animation-delay:120ms]">
          <Generator />
        </div>
      </div>
    </section>
  )
}

function Bullet({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-accent-soft text-accent">{icon}</span>
      <span>{children}</span>
    </li>
  )
}

function Proof() {
  const stats = [
    { value: '0', unit: 'octet', label: 'envoyé à un serveur' },
    { value: '256', unit: 'bits', label: 'clé AES-GCM du coffre' },
    { value: '600 000', unit: 'itérations', label: 'PBKDF2-SHA256, seuil OWASP' },
    { value: '100 %', unit: 'hors ligne', label: 'une fois la page chargée' },
  ]
  return (
    <section aria-label="Chiffres clés" className="border-y border-line bg-surface">
      <div className="container-page grid grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={cx(
              'px-2 py-7 sm:px-6',
              i % 2 === 1 && 'border-l border-line',
              i >= 2 && 'max-lg:border-t max-lg:border-line',
              i === 2 && 'lg:border-l lg:border-line',
            )}
          >
            <p className="flex items-baseline gap-1.5">
              <span className="text-[1.75rem] font-semibold tracking-tight tabular-nums sm:text-[2rem]">{s.value}</span>
              <span className="text-sm text-muted">{s.unit}</span>
            </p>
            <p className="mt-1 text-[13px] text-muted">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function SectionHead({ eyebrow, title, children, id }: { eyebrow: string; title: string; children?: ReactNode; id?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id} className="mt-3 text-[2rem] leading-[1.1] font-semibold tracking-[-0.03em] text-balance sm:text-[2.4rem]">
        {title}
      </h2>
      {children && <p className="mt-4 text-[16.5px] leading-relaxed text-ink-2 text-pretty">{children}</p>}
    </div>
  )
}

function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Votre navigateur tire l’aléa',
      body: 'Le générateur pioche dans la source cryptographique du système d’exploitation, avec un tirage par rejet qui garantit que chaque caractère a exactement la même probabilité.',
    },
    {
      n: '02',
      title: 'Votre mot de passe maître devient une clé',
      body: 'PBKDF2 le transforme en clé de 256 bits en 600 000 tours. Il n’est jamais stocké : sans lui, le coffre n’est qu’un bloc de données illisibles.',
    },
    {
      n: '03',
      title: 'Le coffre est chiffré, puis rangé chez vous',
      body: 'Identifiants et fichiers sont chiffrés en AES-256-GCM avant d’être écrits dans l’IndexedDB de ce navigateur. Rien ne part sur Internet.',
    },
  ]
  return (
    <section aria-labelledby="how" className="container-page pt-24 sm:pt-28">
      <SectionHead id="how" eyebrow="Fonctionnement" title="Un coffre-fort sans serveur à pirater.">
        Les gestionnaires en ligne protègent vos secrets sur leurs machines. Aetheris supprime la question : vos
        données ne quittent jamais l’appareil sur lequel vous les tapez.
      </SectionHead>

      <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_1.05fr] lg:items-center">
        <ol className="space-y-3">
          {steps.map((s) => (
            <li key={s.n} className="card flex gap-5 p-5 sm:p-6">
              <span className="font-mono text-sm font-medium text-accent">{s.n}</span>
              <div>
                <h3 className="font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-2">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <Diagram />
      </div>
    </section>
  )
}

/** Architecture diagram: everything inside the device boundary, the network crossed out. */
function Diagram() {
  return (
    <figure className="card bg-dots relative overflow-hidden p-5 sm:p-7" aria-label="Schéma : le secret ne sort jamais du navigateur">
      <div className="rounded-2xl border-2 border-dashed border-accent/40 bg-surface/80 p-4 backdrop-blur-sm sm:p-5">
        <p className="eyebrow mb-4 flex items-center gap-2 text-accent">
          <Smartphone className="size-3.5" /> Votre appareil
        </p>
        <div className="grid gap-2.5">
          <Node icon={<Fingerprint className="size-4" />} title="Mot de passe maître" note="tapé, jamais stocké" />
          <Arrow label="PBKDF2-SHA256 × 600 000" />
          <Node icon={<KeyRound className="size-4" />} title="Clé de chiffrement" note="en mémoire, effacée au verrouillage" tone="accent" />
          <Arrow label="AES-256-GCM · IV unique" />
          <Node icon={<HardDrive className="size-4" />} title="Coffre chiffré" note="IndexedDB de ce navigateur" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
        <span className="relative grid size-8 place-items-center rounded-lg bg-surface-2 text-muted">
          <DatabaseZap className="size-4" />
          <span className="absolute h-0.5 w-9 rotate-45 rounded bg-s0" />
        </span>
        <div className="text-[13px]">
          <p className="font-medium">Serveur, cloud, compte</p>
          <p className="text-muted">Inexistants. Aucune requête n’est émise.</p>
        </div>
      </div>
    </figure>
  )
}

function Node({ icon, title, note, tone }: { icon: ReactNode; title: string; note: string; tone?: 'accent' }) {
  return (
    <div
      className={cx(
        'flex items-center gap-3 rounded-xl border px-3.5 py-3',
        tone ? 'border-accent/30 bg-accent-soft' : 'border-line bg-surface',
      )}
    >
      <span className={cx('grid size-8 place-items-center rounded-lg', tone ? 'bg-accent text-on-accent' : 'bg-surface-2 text-ink-2')}>
        {icon}
      </span>
      <div className="min-w-0 text-[13.5px]">
        <p className="font-medium">{title}</p>
        <p className="text-muted">{note}</p>
      </div>
    </div>
  )
}

function Arrow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pl-[1.6rem]">
      <span className="h-5 w-px bg-line-strong" />
      <span className="font-mono text-[11px] text-muted">{label}</span>
    </div>
  )
}

function Features() {
  return (
    <section aria-labelledby="features" className="container-page pt-24 sm:pt-28">
      <SectionHead id="features" eyebrow="Fonctionnalités" title="Tout ce qu’un gestionnaire sérieux doit faire.">
        Sans abonnement, sans extension à installer, sans rien envoyer à personne.
      </SectionHead>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Feature
          className="lg:col-span-3"
          icon={<ShieldCheck />}
          title="Coffre-fort chiffré"
          body="Identifiants, notes et fichiers, classés par catégorie, avec favoris, recherche instantanée et verrouillage automatique après inactivité."
          visual={<VaultVisual />}
        />
        <Feature
          className="lg:col-span-3"
          icon={<TimerReset />}
          title="Codes de double authentification"
          body="Collez la clé ou le lien otpauth:// d’un site : Aetheris affiche le code à 6 chiffres, calculé localement selon la RFC 6238."
          visual={<TotpVisual />}
        />
        <Feature
          className="lg:col-span-2"
          icon={<Radar />}
          title="Audit de santé"
          body="Mots de passe faibles, réutilisés ou anciens : un score global et la liste des comptes à corriger en priorité."
        />
        <Feature
          className="lg:col-span-2"
          icon={<Fingerprint />}
          title="Détection de fuites"
          body="Vérifiez si un mot de passe circule dans des fuites connues. Seuls 5 caractères de son empreinte SHA-1 sont envoyés."
        />
        <Feature
          className="lg:col-span-2"
          icon={<FileDown />}
          title="Import et sauvegardes"
          body="Importez le CSV de Chrome, Firefox, Bitwarden ou 1Password. Exportez une sauvegarde chiffrée pour changer d’appareil."
        />
      </div>
    </section>
  )
}

function Feature({
  icon,
  title,
  body,
  visual,
  className,
}: {
  icon: ReactNode
  title: string
  body: string
  visual?: ReactNode
  className?: string
}) {
  return (
    <article className={cx('card flex flex-col overflow-hidden', className)}>
      <div className="p-6">
        <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent [&>svg]:size-5">{icon}</span>
        <h3 className="mt-5 text-[17px] font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{body}</p>
      </div>
      {visual && <div className="mt-auto border-t border-line bg-surface-2 p-5">{visual}</div>}
    </article>
  )
}

function VaultVisual() {
  const rows = [
    ['GitHub', 'ebu@studio.fr', 'bg-ink', 4],
    ['Banque', 'n° client 0042…', 'bg-accent', 4],
    ['Netflix', 'famille@mail.fr', 'bg-s1', 2],
  ] as const
  return (
    <ul aria-hidden className="space-y-2">
      {rows.map(([name, user, bg, score]) => (
        <li key={name} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5">
          <span className={cx('grid size-8 place-items-center rounded-lg text-xs font-semibold text-white', bg)}>{name.slice(0, 2)}</span>
          <div className="min-w-0 flex-1 text-[13px]">
            <p className="font-medium">{name}</p>
            <p className="truncate text-muted">{user}</p>
          </div>
          <span className="font-mono text-[13px] tracking-widest text-muted">••••••••</span>
          <span className={cx('size-2 rounded-full', score === 4 ? 'bg-s4' : 'bg-s1')} />
        </li>
      ))}
    </ul>
  )
}

function TotpVisual() {
  return (
    <div aria-hidden className="flex items-center gap-4 rounded-xl border border-line bg-surface px-4 py-3.5">
      <svg viewBox="0 0 36 36" className="size-10 -rotate-90">
        <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" className="stroke-line" />
        <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" strokeLinecap="round" className="stroke-accent" strokeDasharray="94.2" strokeDashoffset="34" />
      </svg>
      <div>
        <p className="text-[13px] text-muted">GitHub · ebu</p>
        <p className="font-mono text-2xl font-semibold tracking-[0.12em]">
          482 <span className="text-accent">917</span>
        </p>
      </div>
      <span className="ml-auto font-mono text-xs text-muted">19 s</span>
    </div>
  )
}

function Practices() {
  const items = [
    {
      title: 'Un mot de passe par site',
      body: 'Quand un site se fait voler sa base, les attaquants testent le même couple e-mail / mot de passe partout ailleurs. Un secret unique coupe court.',
    },
    {
      title: 'La longueur avant tout',
      body: '20 caractères aléatoires ou 6 mots tirés au sort résistent à tout ce qui existe. Les substitutions « @ pour a » ne trompent aucun logiciel de cassage.',
    },
    {
      title: 'Toujours la double authentification',
      body: 'Même un mot de passe parfait peut fuiter. Un code à usage unique empêche la connexion sans votre téléphone.',
    },
  ]
  return (
    <section aria-labelledby="practices" className="container-page pt-24 sm:pt-28">
      <SectionHead id="practices" eyebrow="Bonnes pratiques" title="Trois règles qui suffisent." />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {items.map((it, i) => (
          <div key={it.title} className="border-t-2 border-ink pt-5">
            <p className="font-mono text-sm text-muted">0{i + 1}</p>
            <h3 className="mt-3 text-lg font-semibold tracking-tight">{it.title}</h3>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{it.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

const FAQ: [string, ReactNode][] = [
  [
    'Mes mots de passe sont-ils envoyés quelque part ?',
    'Non. Le site est un ensemble de fichiers statiques : une fois chargé, il n’émet plus aucune requête. La seule exception est la détection de fuites, que vous déclenchez vous-même, et qui n’envoie que les 5 premiers caractères de l’empreinte SHA-1 du mot de passe, jamais le mot de passe.',
  ],
  [
    'Que se passe-t-il si j’oublie mon mot de passe maître ?',
    'Vos données sont perdues, et c’est voulu : personne, pas même l’auteur du site, ne peut les déchiffrer sans lui. Notez-le sur papier et exportez régulièrement une sauvegarde chiffrée.',
  ],
  [
    'Comment retrouver mon coffre sur un autre appareil ?',
    'Le coffre vit dans le navigateur où vous l’avez créé. Pour le transférer, exportez une sauvegarde chiffrée (Paramètres du coffre), puis importez-la sur l’autre appareil avec le même mot de passe maître.',
  ],
  [
    'Mon ancien coffre Aetheris Vault est-il conservé ?',
    'Oui. À la première ouverture, il est déchiffré avec votre mot de passe actuel, puis re-chiffré avec les nouveaux paramètres (600 000 itérations, clé de données dédiée). Fichiers compris.',
  ],
  [
    'Est-ce aussi sûr qu’un gestionnaire payant ?',
    'Le chiffrement utilise les mêmes primitives standard (AES-256-GCM, PBKDF2), fournies par le navigateur lui-même. La différence : pas de synchronisation automatique ni d’extension de remplissage. En échange, aucune surface d’attaque côté serveur.',
  ],
  [
    'Le site fonctionne-t-il hors ligne ?',
    'Oui. Après une première visite, l’application est mise en cache et s’ouvre sans connexion. Vous pouvez aussi l’installer comme une application depuis le menu de votre navigateur.',
  ],
]

function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="container-page grid gap-10 pt-24 sm:pt-28 lg:grid-cols-[0.8fr_1.2fr]">
      <SectionHead id="faq-title" eyebrow="Questions fréquentes" title="Ce que l’on nous demande.">
        Une autre question ? Le code est ouvert : tout ce qui est affirmé ici se vérifie.
      </SectionHead>
      <div className="divide-y divide-line border-y border-line">
        {FAQ.map(([q, a]) => (
          <details key={q} className="group py-1">
            <summary className="flex items-center justify-between gap-4 py-4 text-[15.5px] font-medium [&::-webkit-details-marker]:hidden">
              {q}
              <Plus className="size-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-45" />
            </summary>
            <p className="pb-5 text-[14.5px] leading-relaxed text-ink-2">{a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

function Cta() {
  return (
    <section className="container-page pt-24 sm:pt-28">
      <div className="relative overflow-hidden rounded-3xl bg-ink px-6 py-14 text-bg sm:px-12 sm:py-16">
        <div aria-hidden className="absolute -top-24 -right-24 size-72 rounded-full bg-accent opacity-40 blur-3xl" />
        <div aria-hidden className="absolute -bottom-32 left-1/3 size-72 rounded-full bg-lime opacity-20 blur-3xl" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <h2 className="text-[2rem] leading-[1.1] font-semibold tracking-[-0.03em] sm:text-[2.5rem]">
              Votre coffre est prêt en 30 secondes.
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed opacity-75">
              Choisissez un mot de passe maître, c’est tout. Pas d’e-mail, pas de compte, pas de carte bancaire.
            </p>
          </div>
          <Link
            href="/coffre"
            className="inline-flex h-12 items-center gap-2 self-start rounded-xl bg-lime px-6 text-[15px] font-semibold text-[#101318] transition-transform active:scale-[0.97] lg:self-auto"
          >
            Ouvrir le coffre-fort
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
