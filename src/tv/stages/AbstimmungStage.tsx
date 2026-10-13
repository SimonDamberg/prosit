import { useResponses } from '../../lib/hooks'
import { ABSTIMMUNG } from '../../shared/content/events'
import { secondsLeft } from '../../shared/game/format'
import type { EventPayload } from '../../shared/game/types'
import { Chip, type StageProps } from './Chip'

type AbstimmungProps = StageProps & { payload: Extract<EventPayload, { kind: 'abstimmung' }> }

/** A vote on the TV: the question and who has voted, then the count and the title. */
export function AbstimmungStage({ event, payload, members, now }: AbstimmungProps) {
  const responses = useResponses(event.id, { pollMs: 3000 })
  const kicker = <p className="text-tv-md font-bold tracking-[0.18em] text-messing-deep uppercase">{ABSTIMMUNG.kicker}</p>

  const result = event.result?.kind === 'abstimmung' ? event.result : null
  if (result) {
    const { winners, votes } = result
    const ranked = members.filter((m) => votes[m.id] !== undefined).sort((x, y) => votes[y.id] - votes[x.id])
    return (
      <>
        {kicker}
        <p className="text-tv-md font-bold">{payload.question}</p>
        {winners.length === 0 ? (
          <h2 className="font-display text-[7rem] leading-none font-bold text-koenig">{ABSTIMMUNG.noVotes}</h2>
        ) : (
          <>
            <h2 className="font-display text-[8rem] leading-none font-bold text-koenig">{payload.title}</h2>
            <ul className="flex flex-wrap justify-center gap-4">
              {ranked.map((m) => (
                <Chip key={m.id} member={m} on={winners.includes(m.id)} note={ABSTIMMUNG.votes(votes[m.id])} />
              ))}
            </ul>
          </>
        )}
      </>
    )
  }

  const voted = (responses.data ?? []).map((r) => r.memberId)
  return (
    <>
      {kicker}
      <h2 className="font-display text-[7rem] leading-none font-bold text-koenig">{payload.question}</h2>
      <p className="text-[8rem] leading-none font-black text-koenig tabular-nums">{secondsLeft(event.endsAt, now)}</p>
      <ul className="flex flex-wrap justify-center gap-4">
        {members.map((m) => (
          <Chip key={m.id} member={m} on={voted.includes(m.id)} />
        ))}
      </ul>
    </>
  )
}
