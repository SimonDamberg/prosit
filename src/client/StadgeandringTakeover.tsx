import { STADGEANDRING } from '../shared/content/events'
import { secondsLeft } from '../shared/game/format'
import type { EventPayload } from '../shared/game/types'
import { Button } from '../ui'
import { LiveModal, VerdictModal } from './EventModal'
import type { TakeoverProps } from './PrositTakeover'
import { useAnswer } from './useAnswer'

type StadgeandringProps = TakeoverProps & { payload: Extract<EventPayload, { kind: 'stadgeandring' }> }

/** A motion to amend the statutes: ja or nej, then the decision. */
export function StadgeandringTakeover({ event, payload, identity, members, now }: StadgeandringProps) {
  const { responses, mine, busy, send } = useAnswer(event, identity)

  const result = event.result?.kind === 'stadgeandring' ? event.result : null
  if (result) {
    return (
      <VerdictModal title={STADGEANDRING.resultTitle} verdict={result.passed ? STADGEANDRING.passed : STADGEANDRING.rejected}>
        <p className="font-bold text-weste">{payload.amendment}</p>
        <p>{STADGEANDRING.tally(result.ja, result.nej)}</p>
        <p>{result.passed ? STADGEANDRING.passedText : STADGEANDRING.rejectedText}</p>
      </VerdictModal>
    )
  }

  const seconds = secondsLeft(event.endsAt, now)
  const vote = mine?.kind === 'stadgeandring' ? mine.ja : null
  return (
    <LiveModal title={STADGEANDRING.kicker} seconds={seconds}>
      <p className="text-sm font-bold text-messing-deep">{STADGEANDRING.motion}</p>
      <p className="font-display text-3xl leading-tight font-bold text-koenig">{payload.amendment}</p>
      {vote !== null ? (
        <p className="text-weste-dim">{STADGEANDRING.voted(vote)}</p>
      ) : (
        <>
          <p className="text-weste-dim">{STADGEANDRING.call}</p>
          <div className="grid w-full grid-cols-2 gap-3">
            <Button size="lg" disabled={busy || seconds === 0} onClick={() => send({ kind: 'stadgeandring', ja: true })}>
              {STADGEANDRING.ja}
            </Button>
            <Button variant="quiet" size="lg" disabled={busy || seconds === 0} onClick={() => send({ kind: 'stadgeandring', ja: false })}>
              {STADGEANDRING.nej}
            </Button>
          </div>
        </>
      )}
      {responses && <p className="text-weste-dim">{STADGEANDRING.count(responses.length, members.length)}</p>}
    </LiveModal>
  )
}
