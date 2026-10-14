import { useResponses } from '../../lib/hooks'
import { STADGEANDRING } from '../../shared/content/events'
import { secondsLeft } from '../../shared/game/format'
import type { EventPayload } from '../../shared/game/types'
import { Chip, type StageProps } from './Chip'

type StadgeandringProps = StageProps & { payload: Extract<EventPayload, { kind: 'stadgeandring' }> }

/** A motion to amend the statutes on the TV: the motion and who has voted, then the decision. */
export function StadgeandringStage({ event, payload, members, now }: StadgeandringProps) {
  const responses = useResponses(event.id, { pollMs: 3000 })
  const kicker = <p className="text-tv-md font-bold tracking-[0.18em] text-messing-deep uppercase">{STADGEANDRING.kicker}</p>

  const result = event.result?.kind === 'stadgeandring' ? event.result : null
  if (result) {
    return (
      <>
        {kicker}
        <p className="font-display text-tv-lg leading-tight font-bold text-koenig">{payload.amendment}</p>
        <h2 className={result.passed ? 'flourish font-display text-[10rem] leading-none font-bold text-gut' : 'animate-stamp font-display text-[10rem] leading-none font-bold text-strafe'}>
          {result.passed ? STADGEANDRING.passed : STADGEANDRING.rejected}
        </h2>
        <p className="text-tv-lg font-black tabular-nums">{STADGEANDRING.tally(result.ja, result.nej)}</p>
        <p className="text-tv-md text-weste-dim">{result.passed ? STADGEANDRING.passedText : STADGEANDRING.rejectedText}</p>
      </>
    )
  }

  const voted = (responses.data ?? []).map((r) => r.memberId)
  return (
    <>
      {kicker}
      <p className="text-tv-md font-bold">{STADGEANDRING.motion}</p>
      <h2 className="font-display text-[7rem] leading-none font-bold text-koenig">{payload.amendment}</h2>
      <p className="text-[8rem] leading-none font-black text-koenig tabular-nums">{secondsLeft(event.endsAt, now)}</p>
      <ul className="flex flex-wrap justify-center gap-4">
        {members.map((m) => (
          <Chip key={m.id} member={m} on={voted.includes(m.id)} />
        ))}
      </ul>
    </>
  )
}
