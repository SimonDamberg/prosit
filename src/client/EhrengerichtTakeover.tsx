import { EHRENGERICHT } from '../shared/content/events'
import { secondsLeft } from '../shared/game/format'
import { ehrengerichtPhases } from '../shared/game/schedule'
import type { EventPayload } from '../shared/game/types'
import { Button } from '../ui'
import { LiveModal, VerdictModal } from './EventModal'
import type { TakeoverProps } from './PrositTakeover'
import { useAnswer } from './useAnswer'

type EhrengerichtProps = TakeoverProps & { payload: Extract<EventPayload, { kind: 'ehrengericht' }> }

/** The tribunal on the phone: the accused defends out loud, then the others vote. */
export function EhrengerichtTakeover({ event, payload, identity, members, now }: EhrengerichtProps) {
  const { responses, mine, busy, send } = useAnswer(event, identity)
  const isAccused = identity.memberId === payload.accused
  const accused = members.find((m) => m.id === payload.accused)?.name ?? '?'

  const result = event.result?.kind === 'ehrengericht' ? event.result : null
  if (result) {
    const verdict = !isAccused ? EHRENGERICHT.youJudged : result.guilty ? EHRENGERICHT.youGuilty : EHRENGERICHT.youAcquitted
    return (
      <VerdictModal title={EHRENGERICHT.resultTitle} verdict={verdict} bad={isAccused && result.guilty}>
        <p className="font-bold text-weste">{result.guilty ? EHRENGERICHT.strafe(accused) : EHRENGERICHT.acquitted(accused)}</p>
        <p>{EHRENGERICHT.tally(result.votes.skyldig, result.votes.frikand)}</p>
      </VerdictModal>
    )
  }

  const { voteFrom } = ehrengerichtPhases(event.startedAt, event.endsAt)
  const voting = now >= voteFrom
  const seconds = secondsLeft(voting ? event.endsAt : voteFrom, now)
  const vote = mine?.kind === 'ehrengericht' ? mine.guilty : null

  return (
    <LiveModal title={isAccused ? EHRENGERICHT.youAccused : EHRENGERICHT.accused(accused)} seconds={seconds}>
      <p className="font-display text-3xl leading-tight font-bold text-koenig">{EHRENGERICHT.charge(payload.charge)}</p>
      {isAccused ? (
        <p className="text-xl font-bold">{voting ? EHRENGERICHT.awaitVerdict : EHRENGERICHT.defend}</p>
      ) : !voting ? (
        <p className="text-weste-dim">{EHRENGERICHT.listen}</p>
      ) : vote !== null ? (
        <p className="text-weste-dim">{EHRENGERICHT.voted(vote)}</p>
      ) : (
        <>
          <p className="text-xl font-bold">{EHRENGERICHT.vote}</p>
          <div className="grid w-full grid-cols-2 gap-3">
            <Button variant="danger" size="lg" disabled={busy || seconds === 0} onClick={() => send({ kind: 'ehrengericht', guilty: true })}>
              {EHRENGERICHT.guilty}
            </Button>
            <Button variant="quiet" size="lg" disabled={busy || seconds === 0} onClick={() => send({ kind: 'ehrengericht', guilty: false })}>
              {EHRENGERICHT.acquit}
            </Button>
          </div>
        </>
      )}
      {voting && responses && (
        <p className="text-weste-dim">{EHRENGERICHT.count(responses.filter((r) => r.memberId !== payload.accused).length, Math.max(0, members.length - 1))}</p>
      )}
    </LiveModal>
  )
}
