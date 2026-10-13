import { fmtInt } from '../shared/game/format'
import { cx } from './cx'

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

function Digit({ value }: { value: number }) {
  return (
    <span className="inline-block h-[1em] overflow-hidden align-top">
      <span
        className="flex flex-col items-center transition-transform duration-700 ease-[cubic-bezier(0.2,0.9,0.25,1.1)]"
        style={{ transform: `translateY(-${value}em)` }}
      >
        {DIGITS.map((d) => (
          <span key={d} className="h-[1em] leading-none">
            {d}
          </span>
        ))}
      </span>
    </span>
  )
}

/** Odometer-style integer: each digit rolls to its new value. Thousands grouped like fmtInt. */
export function RollingNumber({ value, className }: { value: number; className?: string }) {
  // Keyed from the right so each digit keeps its roll when the number gains a digit.
  const chars = [...fmtInt(value)].reverse()
  return (
    <span role="img" aria-label={fmtInt(value)} className={cx('inline-flex items-baseline leading-none tabular-nums', className)}>
      {chars
        .map((c, i) => (/\d/.test(c) ? <Digit key={i} value={Number(c)} /> : <span key={i} className="w-[0.22em]" />))
        .reverse()}
    </span>
  )
}
