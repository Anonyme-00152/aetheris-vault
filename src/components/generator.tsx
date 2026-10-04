import { Check, ChevronDown, Copy, History, KeyRound, RefreshCw, ShieldPlus } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useLocation } from 'wouter'
import {
  DEFAULT_PASSPHRASE,
  DEFAULT_PASSWORD,
  DEFAULT_PIN,
  PASSPHRASE_LIMITS,
  PASSWORD_LIMITS,
  PIN_LIMITS,
  activeSets,
  generatePassphrase,
  generatePassword,
  generatePin,
  type Generated,
  type GeneratorMode,
  type PassphraseOptions,
  type PasswordOptions,
} from '../lib/generator'
import { pushHistory, sessionHistory, setPendingPassword } from '../lib/handoff'
import { useHotkeys, usePersistentState } from '../lib/hooks'
import { DEFAULT_SCENARIO, crackTime, scoreFromBits } from '../lib/strength'
import { SecretText } from './secret-text'
import { StrengthMeter } from './strength-meter'
import { useToast } from './toast'
import { Button, Kbd, Segmented, Switch, cx } from './ui'

const MODES: { value: GeneratorMode; label: string }[] = [
  { value: 'password', label: 'Mot de passe' },
  { value: 'passphrase', label: 'Phrase de passe' },
  { value: 'pin', label: 'Code PIN' },
]

const SEPARATORS: { value: PassphraseOptions['separator']; label: string }[] = [
  { value: '-', label: 'tiret' },
  { value: '.', label: 'point' },
  { value: '_', label: 'souligné' },
  { value: ' ', label: 'espace' },
  { value: 'digit', label: 'chiffres' },
]

interface Prefs {
  mode: GeneratorMode
  password: PasswordOptions
  passphrase: PassphraseOptions
  pin: { length: number }
}

const DEFAULT_PREFS: Prefs = {
  mode: 'password',
  password: DEFAULT_PASSWORD,
  passphrase: DEFAULT_PASSPHRASE,
  pin: DEFAULT_PIN,
}

function run(p: Prefs): Generated {
  if (p.mode === 'passphrase') return generatePassphrase(p.passphrase)
  if (p.mode === 'pin') return generatePin(p.pin)
  return generatePassword(p.password)
}

export function Generator({ compact = false }: { compact?: boolean }) {
  const [prefs, setPrefs] = usePersistentState<Prefs>('aetheris:generator', DEFAULT_PREFS)
  const [result, setResult] = useState<Generated>(() => run(prefs))
  const [round, setRound] = useState(0)
  const [copied, setCopied] = useState(false)
  const [advanced, setAdvanced] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [, navigate] = useLocation()
  const { copy } = useToast()

  const regenerate = useCallback((p: Prefs = prefs) => {
    setResult(run(p))
    setRound((r) => r + 1)
    setCopied(false)
  }, [prefs])

  const update = (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    regenerate(next)
  }
  const setPw = (patch: Partial<PasswordOptions>) => {
    const password = { ...prefs.password, ...patch }
    // Never let the user switch off the last character class.
    if (!activeSets(password).length) return
    update({ password })
  }
  const setPp = (patch: Partial<PassphraseOptions>) => update({ passphrase: { ...prefs.passphrase, ...patch } })

  const doCopy = useCallback(async () => {
    if (!result.value) return
    if (await copy(result.value, 'Copié dans le presse-papiers')) {
      pushHistory(result.value, result.bits, prefs.mode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    }
  }, [copy, result, prefs.mode])

  useHotkeys(useMemo(() => ({ r: () => regenerate(), c: () => doCopy() }), [regenerate, doCopy]))


  const score = scoreFromBits(result.bits)
  const sets = activeSets(prefs.password)
  const limits = prefs.mode === 'password' ? PASSWORD_LIMITS : prefs.mode === 'pin' ? PIN_LIMITS : PASSPHRASE_LIMITS
  const amount =
    prefs.mode === 'password' ? prefs.password.length : prefs.mode === 'pin' ? prefs.pin.length : prefs.passphrase.words
  const setAmount = (n: number) => {
    if (prefs.mode === 'password') setPw({ length: n })
    else if (prefs.mode === 'pin') update({ pin: { length: n } })
    else setPp({ words: n })
  }
  // The slider covers the useful range; the +/- buttons go up to the hard limit.
  const sliderMax = prefs.mode === 'password' ? 64 : limits.max
  const fill = `${((Math.min(amount, sliderMax) - limits.min) / (sliderMax - limits.min)) * 100}%`
  const big = result.value.length > 40

  const saveToVault = () => {
    setPendingPassword(result.value)
    navigate('/coffre')
  }

  return (
    <div className="card shadow-pop relative overflow-hidden">
      {/* Output */}
      <div className="border-b border-line p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented label="Type de secret" value={prefs.mode} onChange={(mode) => update({ mode })} options={MODES} />
          <div className="hidden items-center gap-3 text-xs text-muted md:flex">
            <span className="flex items-center gap-1.5">
              <Kbd>R</Kbd> régénérer
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>C</Kbd> copier
            </span>
          </div>
        </div>

        <div className="mt-5 flex min-h-[88px] items-center rounded-xl border border-line bg-surface-2 px-4 py-4 sm:px-5">
          <output
            aria-live="polite"
            className={cx(
              'min-w-0 flex-1 leading-snug tracking-[0.01em]',
              big ? 'text-[17px] sm:text-[19px]' : 'text-[22px] sm:text-[27px]',
            )}
          >
            <SecretText key={round} value={result.value} animate />
          </output>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="primary" size="lg" onClick={doCopy} className="min-w-[132px] flex-1 sm:flex-none">
            {copied ? <Check className="size-[18px]" /> : <Copy className="size-[18px]" />}
            {copied ? 'Copié' : 'Copier'}
          </Button>
          <Button size="lg" onClick={() => regenerate()} aria-label="Générer un nouveau secret" className="group">
            <RefreshCw className="size-[18px] transition-transform duration-500 group-active:rotate-180" />
            <span className="max-sm:sr-only">Régénérer</span>
          </Button>
          {!compact && (
            <Button size="lg" variant="ghost" onClick={saveToVault} className="ml-auto max-sm:ml-0">
              <ShieldPlus className="size-[18px]" />
              <span>Enregistrer au coffre</span>
            </Button>
          )}
        </div>

        <div className="mt-5 space-y-2.5">
          <StrengthMeter score={score} empty={!result.value} />
          <dl className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted">
            <div className="flex gap-1.5">
              <dt>Entropie</dt>
              <dd className="font-mono font-medium text-ink tabular-nums">{Math.floor(result.bits)} bits</dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Temps de cassage estimé</dt>
              <dd className="font-mono font-medium text-ink">{crackTime(result.bits, DEFAULT_SCENARIO.rate)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-5 p-4 sm:p-6">
        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <label htmlFor="gen-amount" className="text-sm font-medium text-ink-2">
              {prefs.mode === 'passphrase' ? 'Nombre de mots' : 'Longueur'}
            </label>
            <div className="flex items-center gap-1">
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Diminuer"
                disabled={amount <= limits.min}
                onClick={() => setAmount(amount - 1)}
              >
                −
              </Button>
              <span className="w-9 text-center font-mono text-xl font-semibold tabular-nums">{amount}</span>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Augmenter"
                disabled={amount >= limits.max}
                onClick={() => setAmount(amount + 1)}
              >
                +
              </Button>
            </div>
          </div>
          <input
            id="gen-amount"
            type="range"
            className="range"
            min={limits.min}
            max={sliderMax}
            value={Math.min(amount, sliderMax)}
            style={{ ['--fill' as string]: fill }}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </div>

        {prefs.mode === 'password' && (
          <>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Switch label="Majuscules" hint="A B C … Z" checked={prefs.password.upper} onChange={(v) => setPw({ upper: v })} disabled={prefs.password.upper && sets.length === 1} />
              <Switch label="Minuscules" hint="a b c … z" checked={prefs.password.lower} onChange={(v) => setPw({ lower: v })} disabled={prefs.password.lower && sets.length === 1} />
              <Switch label="Chiffres" hint="0 1 2 … 9" checked={prefs.password.digits} onChange={(v) => setPw({ digits: v })} disabled={prefs.password.digits && sets.length === 1} />
              <Switch label="Symboles" hint="! # $ % & * + - = ? @" checked={prefs.password.symbols} onChange={(v) => setPw({ symbols: v })} disabled={prefs.password.symbols && sets.length === 1} />
            </div>
            <div>
              <button
                type="button"
                onClick={() => setAdvanced((a) => !a)}
                aria-expanded={advanced}
                className="flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"
              >
                <ChevronDown className={cx('size-4 transition-transform', advanced && 'rotate-180')} />
                Options avancées
              </button>
              {advanced && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Switch
                    label="Éviter les ambigus"
                    hint="I l 1 | O 0 o B 8 S 5 Z 2"
                    checked={prefs.password.avoidAmbiguous}
                    onChange={(v) => setPw({ avoidAmbiguous: v })}
                  />
                  <label className="flex flex-col justify-center gap-1 rounded-xl border border-line bg-surface px-3.5 py-2">
                    <span className="text-sm font-medium">Caractères exclus</span>
                    <input
                      className="w-full bg-transparent font-mono text-[13px] text-ink outline-none placeholder:text-muted/70"
                      placeholder="ex. {}[]"
                      value={prefs.password.exclude}
                      maxLength={40}
                      spellCheck={false}
                      onChange={(e) => setPw({ exclude: e.target.value })}
                    />
                  </label>
                </div>
              )}
            </div>
          </>
        )}

        {prefs.mode === 'passphrase' && (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Switch label="Majuscule initiale" hint="Abeille-Banane" checked={prefs.passphrase.capitalize} onChange={(v) => setPp({ capitalize: v })} />
              <Switch label="Ajouter un chiffre" hint="Banane7" checked={prefs.passphrase.addNumber} onChange={(v) => setPp({ addNumber: v })} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-sm font-medium text-ink-2">Séparateur</span>
              {SEPARATORS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  aria-pressed={prefs.passphrase.separator === s.value}
                  onClick={() => setPp({ separator: s.value })}
                  className={cx(
                    'rounded-lg border px-2.5 py-1 text-[13px] transition-colors',
                    prefs.passphrase.separator === s.value
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-line text-muted hover:border-line-strong hover:text-ink',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="text-[12.5px] text-muted">
              Mots tirés d’une liste de 1 024 mots français sans accents : 10 bits d’entropie par mot, faciles à
              retenir et à taper sur mobile.
            </p>
          </div>
        )}

        {prefs.mode === 'pin' && (
          <p className="text-[13px] text-muted">
            Réservé aux appareils qui bloquent après quelques essais (carte SIM, téléphone, carte bancaire). Un PIN
            n’est jamais un mot de passe en ligne.
          </p>
        )}
      </div>

      {/* History */}
      {!compact && (
        <div className="border-t border-line bg-surface-2/60">
          <button
            type="button"
            onClick={() => setShowHistory((s) => !s)}
            aria-expanded={showHistory}
            className="flex w-full items-center gap-2 px-4 py-3 text-[13px] font-medium text-muted hover:text-ink sm:px-6"
          >
            <History className="size-4" />
            Historique de la session
            <span className="rounded-full bg-line px-1.5 font-mono text-[11px] text-ink-2">{sessionHistory.length}</span>
            <ChevronDown className={cx('ml-auto size-4 transition-transform', showHistory && 'rotate-180')} />
          </button>
          {showHistory && (
            <div className="px-4 pb-4 sm:px-6">
              {sessionHistory.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line-strong px-4 py-5 text-center text-[13px] text-muted">
                  Les secrets que vous copiez apparaissent ici. Rien n’est enregistré : tout disparaît à la fermeture de
                  l’onglet.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {sessionHistory.map((h) => (
                    <li key={h.id} className="flex items-center gap-3 rounded-lg bg-surface px-3 py-2 text-[13px]">
                      <KeyRound className="size-3.5 shrink-0 text-muted" />
                      <SecretText value={h.value} className="min-w-0 flex-1 truncate" />
                      <span className="hidden font-mono text-[11px] text-muted sm:inline">{Math.floor(h.bits)} bits</span>
                      <Button size="icon-sm" variant="ghost" aria-label="Copier" onClick={() => copy(h.value)}>
                        <Copy className="size-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
