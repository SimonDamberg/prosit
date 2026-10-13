import { ABSTIMMUNG } from '../shared/content/events'
import type { EventPayload } from '../shared/game/types'
import { secondsLeft } from '../shared/game/format'
import { Button } from '../ui'
import { LiveModal, VerdictModal } from './EventModal'
import type { TakeoverProps } from './PrositTakeover'
import { useAnswer } from './useAnswer'

type AbstimmungProps = TakeoverProps & { payload: Extract<EventPayload, { kind: 'abstimmung' }> }

/** A vote on the phone: one button per member, then who took the title. */
export function AbstimmungTakeover({ event, payload, identity, members, now }: AbstimmungProps) {
  const { responses, mine, busy, send } = useAnswer(event, identity)
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? '?'

  const result = event.result?.kind === 'abstimmung' ? event.result : null
  if (result) {
    const won = result.winners.includes(identity.memberId)
    const top = result.winners.length > 0 ? result.votes[result.winners[0]] : 0
    return (
      <VerdictModal
        title={ABSTIMMUNG.resultTitle}
        verdict={result.winners.length === 0 ? ABSTIMMUNG.noVotes : won ? ABSTIMMUNG.youWon(payload.title) : ABSTIMMUNG.youSpared}
        bad={won}
      >
        <p>{payload.question}</p>
        {result.winners.length > 0 && (
          <p>
            {ABSTIMMUNG.holder(payload.title, result.winners.map(nameOf).join(', '))} ({ABSTIMMUNG.votes(top)})
          </p>
        )}
      </VerdictModal>
    )
  }

  const seconds = secondsLeft(event.endsAt, now)
  const vote = mine?.kind === 'abstimmung' ? mine.vote : null
  return (
    <LiveModal title={ABSTIMMUNG.kicker} seconds={seconds}>
      <p className="text-2xl leading-tight font-bold">{payload.question}</p>
      {vote !== null ? (
        <p className="text-weste-dim">{ABSTIMMUNG.voted(nameOf(vote))}</p>
      ) : (
        <>
          <p className="text-weste-dim">{ABSTIMMUNG.call}</p>
          <div className="grid w-full grid-cols-2 gap-3">
            {members.map((m) => (
              <Button
                key={m.id}
                variant="quiet"
                disabled={busy || seconds === 0}
                onClick={() => send({ kind: 'abstimmung', vote: m.id })}
                style={{ color: m.colour }}
                className="min-h-16 px-2"
              >
                <span className="truncate">{m.name}</span>
              </Button>
            ))}
          </div>
        </>
      )}
      {responses && <p className="text-weste-dim">{ABSTIMMUNG.count(responses.length, members.length)}</p>}
    </LiveModal>
  )
}
