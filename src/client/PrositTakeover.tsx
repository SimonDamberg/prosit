import { useState } from 'react'
import { useResponses } from '../lib/hooks'
import { getApi } from '../lib/supabase'
import type { EventRow, Identity, MemberRow } from '../lib/types'
import { PROSIT } from '../shared/content/events'
import { Button, Modal } from '../ui'
import { reportError } from './report'

interface PrositTakeoverProps {
  /** A PROSIT! that is live, or done and still showing its result. Give it `key={event.id}`. */
  event: EventRow
  identity: Identity
  members: readonly MemberRow[]
  /** Server time. */
  now: number
}

/** PROSIT! owns the phone: one huge button while it is live, then the verdict. */
export function PrositTakeover({ event, identity, members, now }: PrositTakeoverProps) {
  const responses = useResponses(event.id)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [closed, setClosed] = useState(false)

  const tapped = sent || (responses.data?.some((r) => r.memberId === identity.memberId) ?? false)
  const result = event.result?.kind === 'prosit' ? event.result : null

  const tap = async () => {
    setBusy(true)
    try {
      await getApi().respond(identity, event.id, { kind: 'prosit' })
      setSent(true)
    } catch (err) {
      reportError(err)
    } finally {
      setBusy(false)
    }
  }

  if (result) {
    const me = identity.memberId
    const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? '?'
    const punished = [...(result.order.length > 1 ? [result.order.at(-1)!] : []), ...result.missed]
    const verdict = punished.includes(me) ? PROSIT.youStrafe : result.order[0] === me ? PROSIT.youFirst : PROSIT.youFine
    return (
      <Modal
        open={!closed}
        onClose={() => setClosed(true)}
        title={PROSIT.resultTitle}
        tone={punished.includes(me) ? 'danger' : 'accent'}
        actions={<Button onClick={() => setClosed(true)}>{PROSIT.close}</Button>}
      >
        <div className="flex flex-col gap-2">
          <p className="text-xl font-bold">{verdict}</p>
          {result.order.length > 0 && <p className="text-weste-dim">{PROSIT.first(nameOf(result.order[0]))}</p>}
          <p className="text-weste-dim">
            {punished.length > 0 ? PROSIT.strafe(punished.map(nameOf).join(', ')) : PROSIT.noStrafe}
          </p>
        </div>
      </Modal>
    )
  }

  const seconds = Math.max(0, Math.ceil((event.endsAt - now) / 1000))
  return (
    <Modal open onClose={() => {}} dismissible={false} title={PROSIT.title} tone="accent">
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-xl font-bold">{tapped ? PROSIT.tapped : PROSIT.call}</p>
        <Button size="lg" block loading={busy} disabled={tapped || seconds === 0} onClick={tap} className="h-40 text-6xl">
          {PROSIT.button}
        </Button>
        <p className="text-5xl leading-none font-black text-koenig tabular-nums">{seconds}</p>
        {responses.data && <p className="text-weste-dim">{PROSIT.tappedCount(responses.data.length, members.length)}</p>}
      </div>
    </Modal>
  )
}
