import { useState, type ReactNode } from 'react'
import { VERDICT_CLOSE } from '../shared/content/events'
import { Button, cx, Modal } from '../ui'

/** A countdown turns red and pulses for its last seconds, as on the TV. */
const URGENT_S = 5

/** An event that is live: it owns the phone and cannot be put away. */
export function LiveModal({ title, seconds, children }: { title: string; seconds?: number; children: ReactNode }) {
  return (
    <Modal open onClose={() => {}} dismissible={false} title={title} tone="accent" band>
      <div className="flex flex-col items-center gap-4 text-center">
        {children}
        {seconds !== undefined && (
          <p
            className={cx(
              'text-5xl leading-none font-black tabular-nums',
              seconds > 0 && seconds <= URGENT_S ? 'animate-urgent text-strafe' : 'text-koenig',
            )}
          >
            {seconds}
          </p>
        )}
      </div>
    </Modal>
  )
}

interface VerdictModalProps {
  title: string
  /** What the result means for this member. */
  verdict: string
  /** The member got a Strafe (or a title nobody wants). */
  bad?: boolean
  children?: ReactNode
}

/** The result of an event, which the member may close before it goes away by itself. */
export function VerdictModal({ title, verdict, bad = false, children }: VerdictModalProps) {
  const [closed, setClosed] = useState(false)
  return (
    <Modal
      open={!closed}
      onClose={() => setClosed(true)}
      title={title}
      tone={bad ? 'danger' : 'accent'}
      band
      actions={<Button onClick={() => setClosed(true)}>{VERDICT_CLOSE}</Button>}
    >
      <div className="flex flex-col gap-2">
        <p className={cx('text-xl font-bold', bad && 'animate-stamp text-strafe')}>{verdict}</p>
        <div className="flex flex-col gap-1 text-weste-dim">{children}</div>
      </div>
    </Modal>
  )
}
