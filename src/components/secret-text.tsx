import { charKind } from '../lib/generator'
import { cx } from './ui'

const KIND_CLASS = {
  upper: 'text-ink',
  lower: 'text-ink',
  digit: 'text-digit',
  symbol: 'text-sym',
} as const

/**
 * Renders a secret with digits and symbols tinted, so similar-looking
 * characters stay easy to tell apart. `animate` replays a short reveal.
 */
export function SecretText({ value, animate, className }: { value: string; animate?: boolean; className?: string }) {
  return (
    <span className={cx('font-mono break-all', className)}>
      <span className="sr-only">{value}</span>
      {[...value].map((c, i) => (
        <span
          key={i}
          aria-hidden
          className={cx(KIND_CLASS[charKind(c)], animate && 'glyph-in inline-block')}
          style={animate ? { animationDelay: `${Math.min(i * 14, 420)}ms` } : undefined}
        >
          {c}
        </span>
      ))}
    </span>
  )
}
