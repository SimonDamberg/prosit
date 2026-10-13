import type { ReactNode } from 'react'
import { cx } from '../ui'

/** A titled box on the dashboard. */
export function Panel({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <section className={cx('sign flex min-h-0 flex-col gap-4 p-7', className)}>
      <h2 className="label-rule font-display text-tv-md leading-none">{title}</h2>
      {children}
    </section>
  )
}
