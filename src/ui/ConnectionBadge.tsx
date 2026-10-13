import type { ConnectionStatus } from '../lib/connection'
import { CONNECTION_LABELS, OFFLINE_BANNER } from '../shared/content/ui'
import { cx } from './cx'

const DOT: Record<ConnectionStatus, string> = {
  connecting: 'bg-weste-dim animate-pulse-live',
  online: 'bg-gut',
  offline: 'bg-strafe animate-pulse-live',
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
          'flex items-center justify-center gap-3 bg-strafe text-center font-bold text-white',
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
        'inline-flex items-center gap-2 rounded-md bg-card font-bold whitespace-nowrap ring-1 ring-koenig/30 ring-inset',
        tv ? 'px-5 py-2 text-xl' : 'px-2.5 py-1 text-xs',
        status === 'offline' ? 'text-strafe' : 'text-weste',
        className,
      )}
    >
      <span className={cx('shrink-0 rounded-full', tv ? 'size-3.5' : 'size-2', DOT[status])} />
      {CONNECTION_LABELS[status]}
    </span>
  )
}
