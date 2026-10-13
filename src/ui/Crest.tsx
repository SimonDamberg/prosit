import { useId } from 'react'
import { BRAND } from '../shared/content/ui'
import { cx } from './cx'

/** The club's shield: a field of Rauten carrying the black vest. Size it with a height class. */
export function Shield({ className }: { className?: string }) {
  const id = useId()
  return (
    <svg viewBox="0 0 100 120" role="img" aria-label={BRAND.club} className={cx('block', className)}>
      <defs>
        <pattern id={id} width="20" height="34" patternUnits="userSpaceOnUse">
          <rect width="20" height="34" fill="var(--color-card)" />
          <path d="M10 0 20 17 10 34 0 17z" fill="var(--color-himmel)" />
        </pattern>
      </defs>
      <path
        d="M4 4H96V62C96 92 72 108 50 116C28 108 4 92 4 62Z"
        fill={`url(#${id})`}
        stroke="var(--color-koenig)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M32 28 42 24 50 50 58 24 68 28 73 50 71 84 58 93 50 82 42 93 29 84 27 50Z"
        fill="var(--color-weste)"
        stroke="var(--color-card)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {[59, 67, 75].map((cy) => (
        <circle key={cy} cx="50" cy={cy} r="1.9" fill="var(--color-messing)" />
      ))}
    </svg>
  )
}

export type CrestSize = 'md' | 'lg' | 'tv'

const SIZE: Record<CrestSize, string> = {
  md: 'text-base',
  lg: 'text-2xl',
  tv: 'text-5xl',
}

/** The full crest: club name, shield, and the motto on a brass ribbon. */
export function Crest({ size = 'md', className }: { size?: CrestSize; className?: string }) {
  return (
    <div className={cx('inline-flex flex-col items-center', SIZE[size], className)}>
      <p className="font-display text-[1.7em] leading-none font-bold whitespace-nowrap text-weste">{BRAND.club}</p>
      <Shield className="mt-[0.5em] h-[6em] w-auto" />
      <p
        className="-mt-[0.9em] bg-messing px-[1.6em] py-[0.3em] text-[0.8em] leading-none font-bold tracking-[0.18em] whitespace-nowrap text-weste uppercase"
        style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 0.7em) 50%, 100% 100%, 0 100%, 0.7em 50%)' }}
      >
        {BRAND.motto}
      </p>
    </div>
  )
}
