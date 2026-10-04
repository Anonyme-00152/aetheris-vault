import { SCORE_LABELS, type Score } from '../lib/strength'
import { cx } from './ui'

const COLORS = ['bg-s0', 'bg-s1', 'bg-s2', 'bg-s3', 'bg-s4'] as const
const TEXT = ['text-s0', 'text-s1', 'text-s2', 'text-s3', 'text-s4'] as const

export function StrengthMeter({ score, empty, className }: { score: Score; empty?: boolean; className?: string }) {
  const filled = empty ? 0 : Math.max(1, score)
  return (
    <div className={cx('flex items-center gap-3', className)}>
      <div
        className="grid flex-1 grid-cols-4 gap-1.5"
        role="meter"
        aria-label="Robustesse"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={empty ? 0 : score}
        aria-valuetext={empty ? 'Aucune' : SCORE_LABELS[score]}
      >
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="h-1.5 overflow-hidden rounded-full bg-line">
            <span
              className={cx(
                'block h-full origin-left rounded-full transition-transform duration-500 ease-[var(--ease-out-quart)]',
                COLORS[score],
              )}
              style={{ transform: `scaleX(${i < filled ? 1 : 0})`, transitionDelay: `${i * 50}ms` }}
            />
          </span>
        ))}
      </div>
      <span className={cx('w-24 text-right text-sm font-semibold', empty ? 'text-muted' : TEXT[score])}>
        {empty ? '—' : SCORE_LABELS[score]}
      </span>
    </div>
  )
}

export function scoreText(score: Score) {
  return TEXT[score]
}
export function scoreBg(score: Score) {
  return COLORS[score]
}
