import { AlertTriangle, ArrowRight, CheckCircle2, Eye, EyeOff, Info, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link } from 'wouter'
import { PageShell } from '../components/layout'
import { StrengthMeter } from '../components/strength-meter'
import { Button, cx } from '../components/ui'
import { pwnedCount } from '../lib/hibp'
import { useDocumentMeta } from '../lib/meta'
import { SCENARIOS, analyze, crackTime } from '../lib/strength'

type Pwned = { state: 'idle' } | { state: 'loading' } | { state: 'done'; count: number } | { state: 'error'; message: string }

export default function Check() {
  useDocumentMeta(
    'Vérificateur de mot de passe — Aetheris',
    'Testez la robustesse d’un mot de passe et vérifiez s’il apparaît dans des fuites de données, sans jamais l’envoyer.',
  )
  const [value, setValue] = useState('')
  const [shown, setShown] = useState(false)
  const [pwned, setPwned] = useState<Pwned>({ state: 'idle' })
  const abort = useRef<AbortController | null>(null)
  const inputId = useId()
  const a = useMemo(() => analyze(value), [value])
  const empty = !value

  useEffect(() => {
    abort.current?.abort()
    setPwned({ state: 'idle' })
  }, [value])

  // Clear the field when leaving the page.
  useEffect(() => () => abort.current?.abort(), [])

  const checkLeaks = async () => {
    abort.current?.abort()
    const ctrl = new AbortController()
    abort.current = ctrl
    setPwned({ state: 'loading' })
    try {
      const count = await pwnedCount(value, ctrl.signal)
      setPwned({ state: 'done', count })
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      setPwned({ state: 'error', message: 'Service injoignable. Vérifiez votre connexion et réessayez.' })
    }
  }

  return (
    <PageShell>
      <section className="container-page pt-12 sm:pt-16">
        <div className="max-w-2xl animate-rise">
          <p className="eyebrow">Vérificateur</p>
          <h1 className="mt-3 text-[2.4rem] leading-[1.05] font-semibold tracking-[-0.035em] text-balance sm:text-[3.2rem]">
            Votre mot de passe tient-il la route&nbsp;?
          </h1>
          <p className="mt-4 text-[17px] leading-relaxed text-ink-2">
            L’analyse se fait dans cette page, caractère par caractère. Le mot de passe n’est ni envoyé, ni enregistré,
            et disparaît dès que vous quittez l’onglet.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <form
            className="card shadow-pop animate-rise p-5 [animation-delay:100ms] sm:p-7"
            onSubmit={(e) => {
              e.preventDefault()
              if (value) checkLeaks()
            }}
          >
            <label htmlFor={inputId} className="text-sm font-medium text-ink-2">
              Mot de passe à tester
            </label>
            <div className="relative mt-2">
              <input
                id={inputId}
                type={shown ? 'text' : 'password'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder="Tapez ou collez un mot de passe"
                className="input h-14 pr-14 font-mono text-[18px]"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShown((s) => !s)}
                aria-label={shown ? 'Masquer' : 'Afficher'}
                className="absolute top-2 right-2"
              >
                {shown ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
              </Button>
            </div>

            <StrengthMeter className="mt-6" score={a.score} empty={empty} />

            <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
              <Stat label="Longueur" value={empty ? '—' : `${a.length} car.`} />
              <Stat label="Entropie estimée" value={empty ? '—' : `${Math.round(a.bits)} bits`} />
              <div className="col-span-2 bg-surface px-4 py-3 sm:col-span-1">
                <dt className="text-[12px] text-muted">Types de caractères</dt>
                <dd className="mt-1.5 flex gap-1">
                  {(
                    [
                      ['a-z', a.classes.lower],
                      ['A-Z', a.classes.upper],
                      ['0-9', a.classes.digits],
                      ['#?!', a.classes.symbols],
                    ] as const
                  ).map(([l, on]) => (
                    <span
                      key={l}
                      className={cx(
                        'rounded-md px-1.5 py-0.5 font-mono text-[11px]',
                        on ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-muted line-through decoration-muted/50',
                      )}
                    >
                      {l}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>

            <h2 className="mt-7 text-sm font-semibold">Temps moyen pour le casser</h2>
            <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
              {SCENARIOS.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium">{s.label}</p>
                    <p className="text-[12.5px] text-muted">{s.detail}</p>
                  </div>
                  <span className="shrink-0 text-right font-mono text-[14px] font-medium">
                    {empty ? '—' : crackTime(a.bits, s.rate)}
                  </span>
                </li>
              ))}
            </ul>

            {!empty && (
              <div className="mt-7">
                <h2 className="text-sm font-semibold">Diagnostic</h2>
                {a.findings.length ? (
                  <ul className="mt-3 space-y-2">
                    {a.findings.map((f, i) => (
                      <li key={i} className="flex gap-2.5 rounded-xl bg-s1/10 px-3.5 py-2.5 text-[14px] text-ink">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-s1" />
                        {f.message}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 flex gap-2.5 rounded-xl bg-accent-soft px-3.5 py-2.5 text-[14px]">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" />
                    Aucun motif prévisible détecté.
                  </p>
                )}
              </div>
            )}
          </form>

          <aside className="space-y-6">
            <div className="card animate-rise p-5 [animation-delay:180ms] sm:p-6">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
                  <ShieldAlert className="size-5" />
                </span>
                <h2 className="text-[17px] font-semibold tracking-tight">A-t-il déjà fuité&nbsp;?</h2>
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
                Comparez-le aux centaines de millions de mots de passe publiés après des piratages, via la base{' '}
                <a href="https://haveibeenpwned.com/Passwords" target="_blank" rel="noreferrer" className="underline decoration-line-strong underline-offset-2 hover:decoration-ink">
                  Have I Been Pwned
                </a>
                .
              </p>
              <Button variant="primary" className="mt-4 w-full" onClick={checkLeaks} disabled={empty || pwned.state === 'loading'}>
                {pwned.state === 'loading' ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                Rechercher dans les fuites
              </Button>
              <div aria-live="polite">
                {pwned.state === 'done' &&
                  (pwned.count > 0 ? (
                    <p className="mt-4 rounded-xl bg-s0/10 px-4 py-3 text-[14px]">
                      <strong className="text-s0">Trouvé {pwned.count.toLocaleString('fr-FR')} fois</strong> dans des
                      fuites. Ne l’utilisez plus, nulle part.
                    </p>
                  ) : (
                    <p className="mt-4 rounded-xl bg-accent-soft px-4 py-3 text-[14px]">
                      <strong className="text-accent">Absent des fuites connues.</strong> Bon signe, mais ce n’est pas
                      une garantie de robustesse.
                    </p>
                  ))}
                {pwned.state === 'error' && <p className="mt-4 text-[13.5px] text-s0">{pwned.message}</p>}
              </div>
              <p className="mt-4 flex gap-2 text-[12.5px] leading-relaxed text-muted">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                Seuls les 5 premiers caractères de l’empreinte SHA-1 sont envoyés (k-anonymat). Le service ne peut pas
                savoir quel mot de passe vous testez.
              </p>
            </div>

            <div className="rounded-2xl border border-line p-5 sm:p-6">
              <h2 className="text-[15px] font-semibold">Comment c’est calculé</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
                L’estimation part de la force brute, puis remplace chaque motif reconnu (mot du dictionnaire, suite de
                clavier, date, répétition, substitution « 4 pour a ») par le coût réel de le deviner. Elle reste
                volontairement prudente.
              </p>
              <Link href="/" className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-medium text-accent hover:underline">
                Générer un mot de passe solide <ArrowRight className="size-4" />
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </PageShell>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface px-4 py-3">
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd className="mt-1 font-mono text-[17px] font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
