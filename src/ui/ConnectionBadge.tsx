import type { ConnectionStatus } from '../lib/connection'
import { CONNECTION_LABELS, OFFLINE_BANNER } from '../shared/content/ui'
import { cx } from './cx'

const DOT: Record<ConnectionStatus, string> = {
  connecting: 'bg-ink-dim animate-pulse-live',
  online: 'bg-cash shadow-[0_0_0.5em_var(--color-cash)]',
  offline: 'bg-drift animate-pulse-live',
}

export interface ConnectionBadgeProps {
  /** Pass useConnection() from src/lib/hooks. */
  status: ConnectionStatus
  /** pill: small header indicator. banner: full-width strip, rendered only while offline. */
  variant?: 'pill' | 'banner'
  size?: 'md' | 'tv'
  className?: string
}

export function ConnectionBadge({ status, variant = 'pill', size = 'md', className }: ConnectionBadgeProps) {
  const tv = size === 'tv'
  if (variant === 'banner') {
    if (status !== 'offline') return null
    return (
      <div
        role="alert"
        className={cx(
          'flex items-center justify-center gap-3 bg-drift text-center font-bold text-white',
          tv ? 'px-6 py-4 text-tv-sm' : 'px-4 py-2.5 text-base',
          className,
        )}
      >
        <span className="size-[0.9em] shrink-0 animate-spin rounded-full border-[0.15em] border-white border-t-transparent" />
        {OFFLINE_BANNER}
      </div>
    )
  }
  return (
    <span
      role="status"
      className={cx(
        'inline-flex items-center gap-2 rounded-full bg-night-deep/70 font-bold tracking-[0.12em] whitespace-nowrap uppercase ring-1 ring-white/15 ring-inset',
        tv ? 'px-5 py-2 text-xl' : 'px-3 py-1 text-xs',
        status === 'offline' ? 'text-drift' : 'text-ink',
        className,
      )}
    >
      <span className={cx('shrink-0 rounded-full', tv ? 'size-3.5' : 'size-2', DOT[status])} />
      {CONNECTION_LABELS[status]}
    </span>
  )
}
