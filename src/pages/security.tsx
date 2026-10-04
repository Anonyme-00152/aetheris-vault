import { Check, Minus, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { PageShell, REPO_URL } from '../components/layout'
import { cx } from '../components/ui'
import { KDF_ITERATIONS } from '../lib/crypto'
import { useDocumentMeta } from '../lib/meta'

const SPECS: [string, ReactNode][] = [
  ['Source d’aléa', <>
    <code>crypto.getRandomValues</code> (CSPRNG du système), tirage par rejet sans biais de modulo
  </>],
  ['Chiffrement', 'AES-256-GCM (chiffrement authentifié), IV aléatoire de 96 bits à chaque écriture'],
  ['Dérivation de clé', <>PBKDF2-HMAC-SHA256, {KDF_ITERATIONS.toLocaleString('fr-FR')} itérations, sel aléatoire de 128 bits</>],
  ['Architecture de clés', 'Clé de données aléatoire (DEK) enveloppée par la clé dérivée du mot de passe (KEK)'],
  ['Stockage', 'IndexedDB du navigateur ; chaque fichier est chiffré séparément'],
  ['Mémoire', 'Clé non exportable côté KEK, effacée au verrouillage et après inactivité'],
  ['Réseau', 'Aucune requête. Exception volontaire : détection de fuites (k-anonymat, 5 caractères de SHA-1)'],
  ['En-têtes', 'Content-Security-Policy stricte, sans script tiers ni police externe ; frame-ancestors none'],
  ['Codes 2FA', 'TOTP RFC 6238 (HMAC-SHA1/256/512), calculés localement'],
]

const THREATS: { label: string; status: 'yes' | 'partial' | 'no'; note: string }[] = [
  { label: 'Piratage d’un serveur', status: 'yes', note: 'Il n’existe aucun serveur qui détienne vos données.' },
  { label: 'Vol de l’ordinateur ou du téléphone éteint', status: 'yes', note: 'Le coffre est illisible sans le mot de passe maître.' },
  { label: 'Attaque par force brute sur le coffre volé', status: 'yes', note: 'Chaque essai coûte 600 000 tours de PBKDF2 : ralentit massivement l’attaquant.' },
  { label: 'Interception réseau', status: 'yes', note: 'Rien ne transite. Le site est servi en HTTPS avec HSTS.' },
  { label: 'Mot de passe maître faible', status: 'partial', note: 'La dérivation ralentit l’attaque, mais un mot de passe court reste devinable. Utilisez une phrase de passe.' },
  { label: 'Logiciel espion sur l’appareil', status: 'no', note: 'Un malware qui lit l’écran ou le clavier voit ce que vous voyez. Aucun logiciel ne protège de cela.' },
  { label: 'Oubli du mot de passe maître', status: 'no', note: 'Aucune récupération possible, par conception.' },
]

export default function Security() {
  useDocumentMeta(
    'Modèle de sécurité — Aetheris',
    'Comment Aetheris protège vos mots de passe : AES-256-GCM, PBKDF2 600 000 itérations, aucune requête réseau, code ouvert.',
  )
  return (
    <PageShell>
      <article className="container-page pt-12 sm:pt-16">
        <header className="max-w-3xl animate-rise">
          <p className="eyebrow">Modèle de sécurité</p>
          <h1 className="mt-3 text-[2.4rem] leading-[1.05] font-semibold tracking-[-0.035em] text-balance sm:text-[3.2rem]">
            Ce qui est protégé, comment, et ce qui ne l’est pas.
          </h1>
          <p className="mt-5 text-[17px] leading-relaxed text-ink-2">
            Un outil de sécurité doit dire clairement ses limites. Voici exactement ce que fait Aetheris, avec les
            paramètres utilisés, pour que vous puissiez le vérifier plutôt que le croire.
          </p>
        </header>

        <section aria-labelledby="threats" className="mt-14">
          <h2 id="threats" className="text-2xl font-semibold tracking-tight">Face à quelles menaces&nbsp;?</h2>
          <ul className="mt-6 grid gap-3 md:grid-cols-2">
            {THREATS.map((t) => (
              <li key={t.label} className="card flex gap-4 p-5">
                <span
                  className={cx(
                    'grid size-8 shrink-0 place-items-center rounded-lg',
                    t.status === 'yes' && 'bg-accent-soft text-accent',
                    t.status === 'partial' && 'bg-s2/15 text-s2',
                    t.status === 'no' && 'bg-s0/10 text-s0',
                  )}
                  aria-label={t.status === 'yes' ? 'Protégé' : t.status === 'partial' ? 'Partiellement' : 'Non protégé'}
                >
                  {t.status === 'yes' ? <Check className="size-4" /> : t.status === 'partial' ? <Minus className="size-4" /> : <X className="size-4" />}
                </span>
                <div>
                  <h3 className="font-medium">{t.label}</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{t.note}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section id="specifications" aria-labelledby="specs" className="mt-20 grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <h2 id="specs" className="text-2xl font-semibold tracking-tight">Spécifications</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
              Toute la cryptographie passe par l’API Web Crypto du navigateur : du code natif, audité, plutôt qu’une
              bibliothèque JavaScript maison.
            </p>
          </div>
          <dl className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {SPECS.map(([k, v]) => (
              <div key={k} className="grid gap-1 px-5 py-4 sm:grid-cols-[180px_1fr] sm:gap-6">
                <dt className="text-[13.5px] font-medium text-muted">{k}</dt>
                <dd className="text-[14.5px] leading-relaxed [&_code]:font-mono [&_code]:text-[13px]">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="verify" className="mt-20 grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <h2 id="verify" className="text-2xl font-semibold tracking-tight">Vérifiez par vous-même</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-2">Deux minutes suffisent, sans compétence particulière.</p>
          </div>
          <ol className="space-y-3">
            {[
              <>Ouvrez les outils de développement (<kbd className="font-mono text-[13px]">F12</kbd>), onglet <b>Réseau</b>, puis générez des mots de passe et utilisez le coffre : aucune requête n’apparaît.</>,
              <>Coupez votre connexion Internet : après une première visite, tout continue de fonctionner.</>,
              <>Dans l’onglet <b>Application → IndexedDB → aetheris</b>, vous ne verrez que des données chiffrées.</>,
              <>
                Lisez le code : il est public sur{' '}
                <a href={REPO_URL} target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline">
                  GitHub
                </a>
                , et la logique de chiffrement tient dans un seul fichier de 150 lignes.
              </>,
            ].map((step, i) => (
              <li key={i} className="flex gap-4 rounded-2xl border border-line p-5">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink font-mono text-[12px] font-medium text-bg">{i + 1}</span>
                <p className="text-[14.5px] leading-relaxed text-ink-2">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="disclosure" className="mt-20 rounded-2xl bg-surface-2 p-6 sm:p-8">
          <h2 id="disclosure" className="text-xl font-semibold tracking-tight">Signaler une faille</h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">
            Vous avez trouvé un problème de sécurité&nbsp;? Ouvrez une alerte privée via l’onglet{' '}
            <a href={`${REPO_URL}/security`} target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline">
              Security du dépôt GitHub
            </a>{' '}
            plutôt qu’un ticket public. Toute remontée est lue et créditée.
          </p>
        </section>
      </article>
    </PageShell>
  )
}
