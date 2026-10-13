import { useState, type ReactNode } from 'react'
import { VERDICT_CLOSE } from '../shared/content/events'
import { Button, Modal } from '../ui'

/** An event that is live: it owns the phone and cannot be put away. */
export function LiveModal({ title, seconds, children }: { title: string; seconds?: number; children: ReactNode }) {
  return (
    <Modal open onClose={() => {}} dismissible={false} title={title} tone="accent">
      <div className="flex flex-col items-center gap-4 text-center">
        {children}
        {seconds !== undefined && <p className="text-5xl leading-none font-black text-koenig tabular-nums">{seconds}</p>}
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
      actions={<Button onClick={() => setClosed(true)}>{VERDICT_CLOSE}</Button>}
    >
      <div className="flex flex-col gap-2">
        <p className="text-xl font-bold">{verdict}</p>
        <div className="flex flex-col gap-1 text-weste-dim">{children}</div>
      </div>
    </Modal>
  )
}
