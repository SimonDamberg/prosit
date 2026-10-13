import { useEffect, useRef } from 'react'
import { useResponses } from '../lib/hooks'
import type { EventRow, MemberRow } from '../lib/types'
import { PROSIT, REGEL } from '../shared/content/events'
import { fmtClock, secondsLeft } from '../shared/game/format'
import { TRINKSPRUCH_FLOOR } from '../shared/game/resolve'
import { stageEvent } from '../shared/game/schedule'
import type { EventResult } from '../shared/game/types'
import { cx } from '../ui'
import { play } from './audio'
import { AbstimmungStage } from './stages/AbstimmungStage'
import { Chip, type StageProps } from './stages/Chip'
import { DuellStage } from './stages/DuellStage'
import { SchatzfrageStage } from './stages/SchatzfrageStage'
import { TrinkspruchStage } from './stages/TrinkspruchStage'
import { useLinger } from './useLinger'

/** A new rule owns the screen this long, then moves to the banner on the dashboard. */
const REGEL_ANNOUNCE_MS = 20_000
/** An event the TV first sees this late (a reload mid-event) is shown without its sound. */
const SOUND_WINDOW_MS = 10_000
/** How long the stage takes to lift away (the stage-out animation). */
const EXIT_MS = 400
/** A countdown turns red and ticks for its last seconds. */
const URGENT_S = 5

/** A result that hands somebody a Strafe gets the trombone, any other the Tusch. */
function hasStrafe(result: EventResult): boolean {
  switch (result.kind) {
    case 'prosit':
      return result.order.length > 1 || result.missed.length > 0
    case 'duell':
      return true
    case 'schatzfrage':
      return result.furthest !== null
    case 'trinkspruch':
      return result.average !== null && result.average < TRINKSPRUCH_FLOOR
    default:
      return false
  }
}

function PrositStage({ event, members, now }: StageProps) {
  const responses = useResponses(event.id, { pollMs: 3000 })
  const result = event.result?.kind === 'prosit' ? event.result : null
  const member = (id: string) => members.find((m) => m.id === id)

  const seconds = secondsLeft(event.endsAt, now)
  const urgent = event.status === 'live' && seconds > 0 && seconds <= URGENT_S
  useEffect(() => {
    if (urgent) play('tick')
  }, [urgent, seconds])

  if (result) {
    const first = member(result.order[0])
    const punished = [...(result.order.length > 1 ? [result.order.at(-1)!] : []), ...result.missed]
    return (
      <>
        <h2 className="font-display text-[9rem] leading-none font-bold text-koenig">{PROSIT.resultTitle}</h2>
        {first && <p className="text-tv-lg font-bold">{PROSIT.first(first.name)}</p>}
        <p className={cx('text-tv-lg font-black', punished.length > 0 ? 'animate-stamp text-strafe' : 'flourish text-gut')}>
          {punished.length > 0 ? PROSIT.strafe(punished.map((id) => member(id)?.name ?? '?').join(', ')) : PROSIT.noStrafe}
        </p>
      </>
    )
  }

  const tapped = (responses.data ?? []).map((r) => r.memberId)
  return (
    <>
      <h2 className="animate-prosit font-display text-[16rem] leading-none font-bold">{PROSIT.title}</h2>
      <p className="text-tv-lg font-bold">{PROSIT.call}</p>
      <p className={cx('text-[9rem] leading-none font-black tabular-nums', urgent ? 'animate-urgent text-strafe' : 'text-koenig')}>
        {seconds}
      </p>
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

interface StageFrameProps extends StageProps {
  /** The event is over and the stage is lifting away. */
  leaving?: boolean
}

/**
 * An event on the TV: the Rauten drop over the dashboard, the sign falls into place and the lines
 * of the stage rise in. When the result arrives the sign turns over.
 */
export function StageFrame({ event, members, now, leaving = false }: StageFrameProps) {
  const live = event.status === 'live'
  return (
    <div
      className={cx(
        'absolute inset-0 z-20 flex items-center justify-center bg-rauten p-12',
        leaving ? 'animate-stage-out' : 'animate-banner-drop',
      )}
    >
      <div
        key={event.status}
        className={cx(
          'sign stagger flex max-h-full w-full max-w-[100rem] flex-col items-center gap-8 overflow-hidden px-16 py-12 text-center',
          live ? 'animate-sign-drop' : 'animate-flip-in',
        )}
      >
        <Stage event={event} members={members} now={now} />
      </div>
      {/* PROSIT! takes the whole screen for a moment before anyone has read a word. */}
      {live && event.kind === 'prosit' && <div className="pointer-events-none absolute inset-0 animate-flash bg-himmel" />}
    </div>
  )
}

/**
 * The event that owns the TV right now, if any: a blocking event (live, then its result), or a rule
 * that has just been proclaimed. Covers the dashboard; renders nothing when no event is on stage.
 */
export function EventStage({ events, members, now }: { events: readonly EventRow[]; members: readonly MemberRow[]; now: number }) {
  const rule = events.filter((e) => e.kind === 'regel' && e.status === 'live' && now < e.startedAt + REGEL_ANNOUNCE_MS).at(-1)
  const event = stageEvent(events, now) ?? rule

  // One sound when an event starts and one when its result is read out. An event the TV first
  // sees late (a reload) stays quiet.
  const sounded = useRef(new Set<string>())
  const since = event === undefined ? 0 : event.status === 'live' ? event.startedAt : (event.resolvedAt ?? 0)
  const fresh = now < since + SOUND_WINDOW_MS
  useEffect(() => {
    if (!event) return
    const key = `${event.id}:${event.status}`
    if (sounded.current.has(key)) return
    sounded.current.add(key)
    if (!fresh) return
    if (event.status === 'live') play(event.kind)
    else if (event.result) play(hasStrafe(event.result) ? 'strafe' : 'tusch')
  }, [event, fresh])

  const { shown, leaving } = useLinger(event, EXIT_MS)
  if (!shown) return null
  return <StageFrame key={shown.id} event={shown} members={members} now={now} leaving={leaving} />
}
