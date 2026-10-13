import { useResponses } from '../../lib/hooks'
import { SCHATZFRAGE } from '../../shared/content/events'
import { fmtNumber, secondsLeft } from '../../shared/game/format'
import type { EventPayload } from '../../shared/game/types'
import { Chip, type StageProps } from './Chip'

type SchatzfrageProps = StageProps & { payload: Extract<EventPayload, { kind: 'schatzfrage' }> }

/** An estimate question on the TV: the question and who has answered, then the answer and every guess. */
export function SchatzfrageStage({ event, payload, members, now }: SchatzfrageProps) {
  const responses = useResponses(event.id, { pollMs: 3000 })
  const kicker = <p className="text-tv-md font-bold tracking-[0.18em] text-messing-deep uppercase">{SCHATZFRAGE.kicker}</p>

  const result = event.result?.kind === 'schatzfrage' ? event.result : null
  if (result) {
    const { guesses, closest, furthest } = result
    const off = (id: string) => Math.abs(guesses[id] - payload.answer)
    const ranked = members.filter((m) => guesses[m.id] !== undefined).sort((x, y) => off(x.id) - off(y.id))
    const loser = members.find((m) => m.id === furthest)
    return (
      <>
        {kicker}
        <p className="text-tv-md font-bold">{payload.question}</p>
        <h2 className="flex items-baseline gap-8 text-koenig">
          <span className="font-display text-[6rem] leading-none font-bold">{SCHATZFRAGE.answerLabel}</span>
          <span className="text-[8rem] leading-none font-black tabular-nums">
            {SCHATZFRAGE.value(fmtNumber(payload.answer), payload.unit)}
          </span>
        </h2>
        {closest === null ? (
          <p className="text-tv-lg font-black text-strafe">{SCHATZFRAGE.nobody}</p>
        ) : (
          <>
            <ul className="flex flex-wrap justify-center gap-4">
              {ranked.map((m) => (
                <Chip key={m.id} member={m} on={m.id === closest} note={fmtNumber(guesses[m.id])} />
              ))}
            </ul>
            <p className={loser ? 'text-tv-lg font-black text-strafe' : 'text-tv-lg font-black text-gut'}>
              {loser ? SCHATZFRAGE.strafe(loser.name) : SCHATZFRAGE.noStrafe}
            </p>
          </>
        )}
      </>
    )
  }

  const answered = (responses.data ?? []).map((r) => r.memberId)
  return (
    <>
      {kicker}
      <h2 className="font-display text-[7rem] leading-none font-bold text-koenig">{payload.question}</h2>
      <p className="text-[8rem] leading-none font-black text-koenig tabular-nums">{secondsLeft(event.endsAt, now)}</p>
      <ul className="flex flex-wrap justify-center gap-4">
        {members.map((m) => (
          <Chip key={m.id} member={m} on={answered.includes(m.id)} />
        ))}
      </ul>
    </>
  )
}
