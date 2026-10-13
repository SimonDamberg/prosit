import { useResponses } from '../../lib/hooks'
import { TRINKSPRUCH } from '../../shared/content/events'
import { fmtNumber, secondsLeft } from '../../shared/game/format'
import { TRINKSPRUCH_FLOOR } from '../../shared/game/resolve'
import { trinkspruchPhases } from '../../shared/game/schedule'
import type { EventPayload } from '../../shared/game/types'
import { Chip, type StageProps } from './Chip'

type TrinkspruchProps = StageProps & { payload: Extract<EventPayload, { kind: 'trinkspruch' }> }

/** A toast speech on the TV: who speaks on what, the clock for each act, then the club's verdict. */
export function TrinkspruchStage({ event, payload, members, now }: TrinkspruchProps) {
  const responses = useResponses(event.id, { pollMs: 3000 })
  const speaker = members.find((m) => m.id === payload.speaker)
  const name = speaker?.name ?? '?'
  const kicker = <p className="text-tv-md font-bold tracking-[0.18em] text-messing-deep uppercase">{TRINKSPRUCH.kicker}</p>

  const result = event.result?.kind === 'trinkspruch' ? event.result : null
  if (result) {
    const { average } = result
    const bad = average !== null && average < TRINKSPRUCH_FLOOR
    return (
      <>
        {kicker}
        <p className="text-tv-md font-bold">{TRINKSPRUCH.speaker(name)}</p>
        {average === null ? (
          <h2 className="font-display text-[7rem] leading-none font-bold text-koenig">{TRINKSPRUCH.none}</h2>
        ) : (
          <>
            <h2 className="flex items-baseline gap-8 text-koenig">
              <span className="font-display text-[6rem] leading-none font-bold">{TRINKSPRUCH.averageLabel}</span>
              <span className="text-[8rem] leading-none font-black tabular-nums">{TRINKSPRUCH.average(fmtNumber(average))}</span>
            </h2>
            <p className={bad ? 'text-tv-lg font-black text-strafe' : 'text-tv-lg font-black text-gut'}>
              {bad ? TRINKSPRUCH.strafe(name) : TRINKSPRUCH.points(name, Math.round(average))}
            </p>
          </>
        )}
      </>
    )
  }

  const { speechFrom, speechTo } = trinkspruchPhases(event.startedAt, event.endsAt)
  const phase = now < speechFrom ? 'prep' : now < speechTo ? 'speech' : 'rating'
  const seconds = secondsLeft(phase === 'prep' ? speechFrom : phase === 'speech' ? speechTo : event.endsAt, now)
  const rated = (responses.data ?? []).map((r) => r.memberId)
  return (
    <>
      {kicker}
      <h2 className="font-display text-[8rem] leading-none font-bold" style={{ color: speaker?.colour }}>
        {TRINKSPRUCH.speaker(name)}
      </h2>
      <p className="font-display text-tv-lg leading-tight font-bold text-koenig">{payload.topic}</p>
      <p className="flex items-baseline gap-8">
        <span className="text-tv-lg font-bold">
          {phase === 'prep' ? TRINKSPRUCH.prep : phase === 'speech' ? TRINKSPRUCH.speaking : TRINKSPRUCH.rating}
        </span>
        <span className="text-[7rem] leading-none font-black text-koenig tabular-nums">{seconds}</span>
      </p>
      {phase === 'rating' && (
        <ul className="flex flex-wrap justify-center gap-4">
          {members
            .filter((m) => m.id !== payload.speaker)
            .map((m) => (
              <Chip key={m.id} member={m} on={rated.includes(m.id)} />
            ))}
        </ul>
      )}
    </>
  )
}
