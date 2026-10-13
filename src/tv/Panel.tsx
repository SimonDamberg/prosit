import type { ReactNode } from 'react'
import { cx } from '../ui'

/** A titled box on the dashboard. */
export function Panel({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <section className={cx('flex min-h-0 flex-col gap-4 rounded-3xl bg-tote/40 p-7 ring-2 ring-tote-hi/40 ring-inset', className)}>
      <h2 className="font-display text-tv-sm leading-none font-black tracking-wide text-ink-dim uppercase">{title}</h2>
      {children}
    </section>
  )
}
