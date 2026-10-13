import { useEffect, useRef } from 'react'
import { useResponses } from '../lib/hooks'
import type { EventRow, MemberRow } from '../lib/types'
import { PROSIT, REGEL } from '../shared/content/events'
import { fmtClock } from '../shared/game/format'
import { onStage } from '../shared/game/schedule'
import { cx } from '../ui'
import { playAlarm, playBell } from './audio'

/** A new rule owns the screen this long, then moves to the banner on the dashboard. */
const REGEL_ANNOUNCE_MS = 20_000
/** An event the TV first sees this late (a reload mid-event) is shown without its sound. */
const SOUND_WINDOW_MS = 10_000

interface StageProps {
  event: EventRow
  members: readonly MemberRow[]
  /** Server time. */
  now: number
}

function Chip({ member, on, order }: { member: MemberRow; on: boolean; order?: number }) {
  return (
    <li
      style={on ? { backgroundColor: member.colour, borderColor: member.colour } : { color: member.colour }}
      className={cx(
        'flex items-center gap-3 rounded-lg border-4 px-6 py-3 font-display text-tv-md leading-none font-bold',
        on ? 'text-white' : 'border-current bg-card opacity-60',
      )}
    >
      {order !== undefined && <span className="font-body text-tv-sm font-black tabular-nums">{order}.</span>}
      {member.name}
    </li>
  )
}

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
  const seconds = Math.max(0, Math.ceil((event.endsAt - now) / 1000))
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

/**
 * The event that owns the TV right now, if any: a PROSIT! (live, then its result), or a rule that
 * has just been proclaimed. Covers the dashboard; renders nothing when no event is on stage.
 */
export function EventStage({ events, members, now }: { events: readonly EventRow[]; members: readonly MemberRow[]; now: number }) {
  const prosit = onStage(events, 'prosit', now)
  const rule = events.filter((e) => e.kind === 'regel' && e.status === 'live' && now < e.startedAt + REGEL_ANNOUNCE_MS).at(-1)
  const event = prosit ?? rule

  // One sound per event, when it starts.
  const sounded = useRef(new Set<string>())
  const fresh = event !== undefined && event.status === 'live' && now < event.startedAt + SOUND_WINDOW_MS
  useEffect(() => {
    if (!event || sounded.current.has(event.id)) return
    sounded.current.add(event.id)
    if (!fresh) return
    if (event.kind === 'prosit') playAlarm()
    else playBell()
  }, [event, fresh])

  if (!event) return null
  const Stage = event.kind === 'prosit' ? PrositStage : RegelStage
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
