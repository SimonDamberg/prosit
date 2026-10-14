import { useResponses } from '../../lib/hooks'
import { EHRENGERICHT } from '../../shared/content/events'
import { secondsLeft } from '../../shared/game/format'
import { ehrengerichtPhases } from '../../shared/game/schedule'
import type { EventPayload } from '../../shared/game/types'
import { Chip, type StageProps } from './Chip'

type EhrengerichtProps = StageProps & { payload: Extract<EventPayload, { kind: 'ehrengericht' }> }

/** The tribunal on the TV: the accused in the dock, the charge, the defence clock, then the verdict. */
export function EhrengerichtStage({ event, payload, members, now }: EhrengerichtProps) {
  const responses = useResponses(event.id, { pollMs: 3000 })
  const accused = members.find((m) => m.id === payload.accused)
  const name = accused?.name ?? '?'
  const kicker = <p className="text-tv-md font-bold tracking-[0.18em] text-messing-deep uppercase">{EHRENGERICHT.kicker}</p>

  const result = event.result?.kind === 'ehrengericht' ? event.result : null
  if (result) {
    return (
      <>
        {kicker}
        <p className="text-tv-md font-bold">{EHRENGERICHT.accused(name)}</p>
        <h2 className={result.guilty ? 'animate-stamp font-display text-[10rem] leading-none font-bold text-strafe' : 'flourish font-display text-[10rem] leading-none font-bold text-gut'}>
          {result.guilty ? EHRENGERICHT.verdictGuilty : EHRENGERICHT.verdictAcquitted}
        </h2>
        <p className="text-tv-lg font-black tabular-nums">{EHRENGERICHT.tally(result.votes.skyldig, result.votes.frikand)}</p>
        <p className="text-tv-md text-weste-dim">{result.guilty ? EHRENGERICHT.strafe(name) : EHRENGERICHT.acquitted(name)}</p>
      </>
    )
  }

  const { voteFrom } = ehrengerichtPhases(event.startedAt, event.endsAt)
  const voting = now >= voteFrom
  const seconds = secondsLeft(voting ? event.endsAt : voteFrom, now)
  const voted = (responses.data ?? []).map((r) => r.memberId)
  return (
    <>
      {kicker}
      <h2 className="font-display text-[8rem] leading-none font-bold" style={{ color: accused?.colour }}>
        {EHRENGERICHT.accused(name)}
      </h2>
      <p className="font-display text-tv-lg leading-tight font-bold text-koenig">{EHRENGERICHT.charge(payload.charge)}</p>
      <p className="flex items-baseline gap-8">
        <span className="text-tv-lg font-bold">{voting ? EHRENGERICHT.deliberation : EHRENGERICHT.defence}</span>
        <span className="text-[7rem] leading-none font-black text-koenig tabular-nums">{seconds}</span>
      </p>
      {voting && (
        <ul className="flex flex-wrap justify-center gap-4">
          {members
            .filter((m) => m.id !== payload.accused)
            .map((m) => (
              <Chip key={m.id} member={m} on={voted.includes(m.id)} />
            ))}
        </ul>
      )}
    </>
  )
}
