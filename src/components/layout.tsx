import { Menu, Moon, ShieldCheck, Sun, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'wouter'
import { useTheme } from '../lib/hooks'
import { Button, cx } from './ui'

export const REPO_URL = 'https://github.com/Anonyme-00152/aetheris-vault'

export function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a10.9 10.9 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  )
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" className="fill-ink" />
      <path d="M16 6.5 24.5 25h-4.1L16 15.2 11.6 25H7.5L16 6.5Z" className="fill-bg" />
      <circle cx="16" cy="21.2" r="2.6" fill="var(--lime)" />
    </svg>
  )
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-lg" aria-label="Aetheris, accueil">
      <LogoMark className="size-8" />
      <span className="text-[17px] font-semibold tracking-tight">Aetheris</span>
    </Link>
  )
}

const NAV = [
  { href: '/', label: 'Générateur' },
  { href: '/verifier', label: 'Vérificateur' },
  { href: '/coffre', label: 'Coffre-fort' },
  { href: '/securite', label: 'Sécurité' },
]

export function ThemeToggle() {
  const [theme, setTheme] = useTheme()
  const dark = theme === 'dark'
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Passer en thème clair' : 'Passer en thème sombre'}
      title={dark ? 'Thème clair' : 'Thème sombre'}
    >
      {dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </Button>
  )
}

export function Header() {
  const [location] = useLocation()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => setOpen(false), [location])
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cx(
        'sticky top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter] duration-200',
        scrolled || open ? 'border-line bg-bg/85 backdrop-blur-xl' : 'border-transparent',
      )}
    >
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-3 focus:py-2 focus:text-bg"
      >
        Aller au contenu
      </a>
      <div className="container-page flex h-16 items-center gap-6">
        <Logo />
        <nav aria-label="Navigation principale" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV.map((n) => {
              const active = n.href === '/' ? location === '/' : location.startsWith(n.href)
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                      'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      active ? 'text-ink' : 'text-muted hover:text-ink',
                    )}
                  >
                    {n.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Code source sur GitHub"
            className="hidden size-10 items-center justify-center rounded-xl text-ink-2 hover:bg-surface-2 hover:text-ink sm:inline-flex"
          >
            <GithubIcon className="size-[18px]" />
          </a>
          <Link
            href="/coffre"
            className="ml-1 hidden h-10 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-medium text-bg transition-transform active:scale-[0.97] sm:inline-flex"
          >
            <ShieldCheck className="size-4" />
            Ouvrir le coffre
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>
      {open && (
        <nav aria-label="Navigation mobile" className="container-page border-t border-line pt-2 pb-4 md:hidden">
          <ul className="grid gap-1">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className="flex h-12 items-center rounded-xl px-3 text-[15px] font-medium text-ink-2 hover:bg-surface-2"
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  )
}

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="max-w-xs space-y-3">
          <Logo />
          <p className="text-sm leading-relaxed text-muted">
            Générateur et coffre-fort de mots de passe qui fonctionnent entièrement dans votre navigateur. Pas de
            compte, pas de serveur, pas de traçage.
          </p>
        </div>
        <FooterCol
          title="Outils"
          links={[
            ['/', 'Générateur'],
            ['/verifier', 'Vérificateur'],
            ['/coffre', 'Coffre-fort'],
          ]}
        />
        <FooterCol
          title="Confiance"
          links={[
            ['/securite', 'Modèle de sécurité'],
            ['/securite#specifications', 'Spécifications'],
            ['/#faq', 'Questions fréquentes'],
          ]}
        />
        <div className="space-y-3">
          <h2 className="eyebrow">Projet</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-ink-2 hover:text-ink">
                Code source
              </a>
            </li>
            <li>
              <a href="https://github.com/Anonyme-00152" target="_blank" rel="noreferrer" className="text-ink-2 hover:text-ink">
                Auteur
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="container-page flex flex-col gap-2 border-t border-line py-6 text-[12.5px] text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Aetheris. Aucun cookie, aucune donnée collectée.</p>
        <p className="font-mono">AES-256-GCM · PBKDF2-SHA256 · 600 000 itérations</p>
      </div>
    </footer>
  )
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="space-y-3">
      <h2 className="eyebrow">{title}</h2>
      <ul className="space-y-2 text-sm">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="text-ink-2 hover:text-ink">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PageShell({ children, footer = true }: { children: ReactNode; footer?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main id="contenu" className="flex-1">
        {children}
      </main>
      {footer && <Footer />}
    </div>
  )
}
