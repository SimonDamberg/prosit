import { useEffect, useRef } from 'react'
import { useResponses } from '../lib/hooks'
import type { EventRow, MemberRow } from '../lib/types'
import { PROSIT, REGEL } from '../shared/content/events'
import { fmtClock, secondsLeft } from '../shared/game/format'
import { stageEvent } from '../shared/game/schedule'
import { cx } from '../ui'
import { playAlarm, playBell, playCall } from './audio'
import { AbstimmungStage } from './stages/AbstimmungStage'
import { Chip, type StageProps } from './stages/Chip'
import { DuellStage } from './stages/DuellStage'
import { SchatzfrageStage } from './stages/SchatzfrageStage'
import { TrinkspruchStage } from './stages/TrinkspruchStage'

/** A new rule owns the screen this long, then moves to the banner on the dashboard. */
const REGEL_ANNOUNCE_MS = 20_000
/** An event the TV first sees this late (a reload mid-event) is shown without its sound. */
const SOUND_WINDOW_MS = 10_000

function PrositStage({ event, members, now }: StageProps) {
  const responses = useResponses(event.id, { pollMs: 3000 })
  const result = event.result?.kind === 'prosit' ? event.result : null
  const member = (id: string) => members.find((m) => m.id === id)

  if (result) {
    const first = member(result.order[0])
    const punished = [...(result.order.length > 1 ? [result.order.at(-1)!] : []), ...result.missed]
    return (
      <>
        <h2 className="font-display text-[9rem] leading-none font-bold text-koenig">{PROSIT.resultTitle}</h2>
        {first && <p className="text-tv-lg font-bold">{PROSIT.first(first.name)}</p>}
        <p className={cx('text-tv-lg font-black', punished.length > 0 ? 'text-strafe' : 'text-gut')}>
          {punished.length > 0 ? PROSIT.strafe(punished.map((id) => member(id)?.name ?? '?').join(', ')) : PROSIT.noStrafe}
        </p>
      </>
    )
  }

  const tapped = (responses.data ?? []).map((r) => r.memberId)
  const seconds = secondsLeft(event.endsAt, now)
  return (
    <>
      <h2 className="animate-alarm font-display text-[16rem] leading-none font-bold">{PROSIT.title}</h2>
      <p className="text-tv-lg font-bold">{PROSIT.call}</p>
      <p className="text-[9rem] leading-none font-black text-koenig tabular-nums">{seconds}</p>
      <ul className="flex flex-wrap justify-center gap-4">
        {members.map((m) => {
          const place = tapped.indexOf(m.id)
          return <Chip key={m.id} member={m} on={place !== -1} order={place === -1 ? undefined : place + 1} />
        })}
      </ul>
    </>
  )
}

function RegelStage({ event, now }: StageProps) {
  if (event.payload.kind !== 'regel') return null
  return (
    <>
      <p className="text-tv-md font-bold tracking-[0.18em] text-messing-deep uppercase">{REGEL.kicker}</p>
      <h2 className="font-display text-[8rem] leading-none font-bold text-koenig">{event.payload.rule}</h2>
      <p className="text-tv-lg font-bold tabular-nums">{REGEL.holds(fmtClock((event.endsAt - now) / 1000))}</p>
      <p className="text-tv-md text-weste-dim">{REGEL.hint}</p>
    </>
  )
}

/** The stage for an event, by its kind. */
function Stage(props: StageProps) {
  const { payload } = props.event
  switch (payload.kind) {
    case 'prosit':
      return <PrositStage {...props} />
    case 'regel':
      return <RegelStage {...props} />
    case 'duell':
      return <DuellStage {...props} payload={payload} />
    case 'abstimmung':
      return <AbstimmungStage {...props} payload={payload} />
    case 'schatzfrage':
      return <SchatzfrageStage {...props} payload={payload} />
    case 'trinkspruch':
      return <TrinkspruchStage {...props} payload={payload} />
  }
}

/**
 * The event that owns the TV right now, if any: a blocking event (live, then its result), or a rule
 * that has just been proclaimed. Covers the dashboard; renders nothing when no event is on stage.
 */
export function EventStage({ events, members, now }: { events: readonly EventRow[]; members: readonly MemberRow[]; now: number }) {
  const rule = events.filter((e) => e.kind === 'regel' && e.status === 'live' && now < e.startedAt + REGEL_ANNOUNCE_MS).at(-1)
  const event = stageEvent(events, now) ?? rule

  // One sound per event, when it starts.
  const sounded = useRef(new Set<string>())
  const fresh = event !== undefined && event.status === 'live' && now < event.startedAt + SOUND_WINDOW_MS
  useEffect(() => {
    if (!event || sounded.current.has(event.id)) return
    sounded.current.add(event.id)
    if (!fresh) return
    if (event.kind === 'prosit') playAlarm()
    else if (event.kind === 'regel') playBell()
    else playCall()
  }, [event, fresh])

  if (!event) return null
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-rauten p-12">
      <div
        key={`${event.id}:${event.status}`}
        className="sign flex max-h-full w-full max-w-[100rem] animate-pop-in flex-col items-center gap-8 overflow-hidden px-16 py-12 text-center"
      >
        <Stage event={event} members={members} now={now} />
      </div>
    </div>
  )
}
