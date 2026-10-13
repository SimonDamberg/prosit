import type { EventRow, Identity, MemberRow } from '../lib/types'
import { PROSIT } from '../shared/content/events'
import { secondsLeft } from '../shared/game/format'
import { Button, cx } from '../ui'
import { LiveModal, VerdictModal } from './EventModal'
import { useAnswer } from './useAnswer'

export interface TakeoverProps {
  /** An event that is live, or done and still showing its result. Give it `key={event.id}`. */
  event: EventRow
  identity: Identity
  members: readonly MemberRow[]
  /** Server time. */
  now: number
}

/** PROSIT! owns the phone: one huge button while it is live, then the verdict. */
export function PrositTakeover({ event, identity, members, now }: TakeoverProps) {
  const { responses, mine, busy, send } = useAnswer(event, identity)
  const result = event.result?.kind === 'prosit' ? event.result : null

  if (result) {
    const me = identity.memberId
    const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? '?'
    const punished = [...(result.order.length > 1 ? [result.order.at(-1)!] : []), ...result.missed]
    const verdict = punished.includes(me) ? PROSIT.youStrafe : result.order[0] === me ? PROSIT.youFirst : PROSIT.youFine
    return (
      <VerdictModal title={PROSIT.resultTitle} verdict={verdict} bad={punished.includes(me)}>
        {result.order.length > 0 && <p>{PROSIT.first(nameOf(result.order[0]))}</p>}
        <p>{punished.length > 0 ? PROSIT.strafe(punished.map(nameOf).join(', ')) : PROSIT.noStrafe}</p>
      </VerdictModal>
    )
  }

  const seconds = secondsLeft(event.endsAt, now)
  const tapped = mine !== null
  return (
    <LiveModal title={PROSIT.title} seconds={seconds}>
      <p className="text-xl font-bold">{tapped ? PROSIT.tapped : PROSIT.call}</p>
      <Button
        size="lg"
        block
        loading={busy}
        disabled={tapped || seconds === 0}
        onClick={() => send({ kind: 'prosit' })}
        className={cx('h-40 text-6xl', !tapped && !busy && seconds > 0 && 'animate-breathe')}
      >
        {PROSIT.button}
      </Button>
      {responses && <p className="text-weste-dim">{PROSIT.tappedCount(responses.length, members.length)}</p>}
    </LiveModal>
  )
}
