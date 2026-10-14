import { useEffect, useMemo, useRef } from 'react'
import type { DrinkRow, EventRow, MemberRow, NightRow, PointsRow, StrafeRow } from '../lib/types'
import { AWARDS, FINALE } from '../shared/content/awards'
import { BRAND } from '../shared/content/ui'
import { awardsOf, awardValue, computeAwards, finaleStep, type Award, type FinaleStep } from '../shared/game/awards'
import { rankTallies, strafeTally, tallyDrinks } from '../shared/game/drinks'
import { fmtLitres } from '../shared/game/format'
import { cx, Crest } from '../ui'
import { play } from './audio'
import { say } from './herold'
import { HEROLD } from '../shared/content/tv'
import { setStageBusy } from './music'

/** A cue due further back than this (a reloaded TV) is skipped. */
const SOUND_WINDOW_MS = 2_000

interface FinaleProps {
  night: NightRow
  members: readonly MemberRow[]
  drinks: readonly DrinkRow[]
  strafen: readonly StrafeRow[]
  points: readonly PointsRow[]
  events: readonly EventRow[]
  now: number
}

/** Plays each cue of the ceremony once, when its moment comes. */
function useFinaleSounds(step: FinaleStep, awards: readonly Award[], members: readonly MemberRow[], now: number) {
  const sounded = useRef(new Set<string>())
  const cue = (key: string, at: number, name: Parameters<typeof play>[0], line?: string) => {
    if (now < at || sounded.current.has(key)) return
    sounded.current.add(key)
    if (now >= at + SOUND_WINDOW_MS) return
    play(name)
    if (line) say(line, name === 'fanfare' ? 3200 : 1400)
  }
  useEffect(() => {
    if (step.phase !== 'award') return
    const award = awards[step.index]
    const names = award.memberIds.flatMap((id) => members.find((m) => m.id === id)?.name ?? []).join(', ')
    cue(`roll:${step.index}`, step.startsAt, 'trommelwirbel')
    cue(`reveal:${step.index}`, step.revealAt, award.key === 'praesident' ? 'fanfare' : 'tusch', HEROLD.award(AWARDS[award.key].title, names))
  })

  // The playlist steps back for the ceremony and returns for the rest of the night.
  const ceremony = step.phase !== 'standings'
  useEffect(() => {
    setStageBusy(ceremony)
  }, [ceremony])
  useEffect(() => () => setStageBusy(false), [])
}

function Intro({ awards }: { awards: number }) {
  return (
    <>
      <Crest size="tv" />
      <p className="text-tv-md font-bold tracking-[0.18em] text-messing-deep uppercase">{FINALE.kicker}</p>
      <h2 className="animate-slam font-display text-[11rem] leading-none font-bold text-koenig">{FINALE.title}</h2>
      <p className="max-w-6xl text-tv-md text-weste-dim">{awards > 0 ? FINALE.intro : FINALE.none}</p>
    </>
  )
}

function AwardCard({ award, index, of, revealed, members }: { award: Award; index: number; of: number; revealed: boolean; members: readonly MemberRow[] }) {
  const copy = AWARDS[award.key]
  const grand = award.key === 'praesident'
  const winners = award.memberIds.flatMap((id) => members.filter((m) => m.id === id))
  return (
    <>
      <p className="text-tv-md font-bold tracking-[0.18em] text-messing-deep uppercase">
        {grand ? FINALE.grand : FINALE.count(index + 1, of)}
      </p>
      <h2 className={cx('font-display leading-none font-bold text-koenig', grand ? 'text-[10rem]' : 'text-[8rem]')}>{copy.title}</h2>
      {revealed ? (
        <>
          <p className="flex flex-wrap justify-center gap-x-12 font-display text-[9rem] leading-none font-bold">
            {winners.map((m) => (
              <span key={m.id} className="animate-thud" style={{ color: m.colour }}>
                {m.name}
              </span>
            ))}
          </p>
          <p className="flourish text-tv-lg font-black tabular-nums">{copy.value(awardValue(award))}</p>
          <p className="max-w-6xl text-tv-md text-weste-dim">{copy.citation}</p>
        </>
      ) : (
        <p className="animate-breathe text-tv-lg font-bold text-weste-dim">{FINALE.drumroll}</p>
      )}
    </>
  )
}

function Standings({ members, drinks, strafen, points, awards }: Omit<FinaleProps, 'night' | 'events' | 'now'> & { awards: readonly Award[] }) {
  const ids = members.map((m) => m.id)
  const ranked = rankTallies(tallyDrinks(drinks, ids))
  const strafeCounts = strafeTally(strafen)
  const pointsOf = (id: string) => points.filter((p) => p.memberId === id).reduce((sum, p) => sum + p.amount, 0)
  const head = 'px-6 pb-3 text-right text-tv-sm font-bold text-weste-dim'
  const cell = 'px-6 py-3 text-right text-tv-md font-black tabular-nums'
  return (
    <>
      <h2 className="font-display text-[7rem] leading-none font-bold text-koenig">{FINALE.standingsTitle}</h2>
      <table className="w-full max-w-7xl border-collapse">
        <thead>
          <tr className="border-b-4 border-koenig">
            <th />
            <th className={head}>{FINALE.litres}</th>
            <th className={head}>{FINALE.strafen}</th>
            <th className={head}>{FINALE.points}</th>
            <th className={head}>{FINALE.awards}</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((t) => {
            const member = members.find((m) => m.id === t.memberId)!
            return (
              <tr key={t.memberId} className="border-b-2 border-paper-deep">
                <td className="px-6 py-3 text-left font-display text-tv-lg leading-none font-bold" style={{ color: member.colour }}>
                  {member.name}
                </td>
                <td className={cx(cell, 'text-koenig')}>{fmtLitres(t.cl, 2)}</td>
                <td className={cx(cell, 'text-strafe')}>{strafeCounts[t.memberId] ?? 0}</td>
                <td className={cell}>{pointsOf(t.memberId)}</td>
                <td className={cx(cell, 'text-messing-deep')}>{awardsOf(awards, t.memberId).length}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="font-display text-tv-lg leading-none font-bold">{FINALE.goodnight}</p>
      <p className="text-tv-sm font-bold tracking-[0.18em] text-messing-deep uppercase">{BRAND.motto}</p>
    </>
  )
}

/**
 * The ended night on the TV: the awards ceremony, one honour at a time with a drum roll, then the
 * final protocol, which stays up. Timed from night.ended_at on server time, so it needs no hand.
 */
export function Finale({ night, members, drinks, strafen, points, events, now }: FinaleProps) {
  const awards = useMemo(
    () => computeAwards({ memberIds: members.map((m) => m.id), drinks, strafen, points, events, endedAt: night.endedAt }),
    [members, drinks, strafen, points, events, night.endedAt],
  )
  const step = finaleStep(night.endedAt ?? now, awards.length, now)
  useFinaleSounds(step, awards, members, now)

  const revealed = step.phase === 'award' && now >= step.revealAt
  const key = step.phase === 'award' ? `award:${step.index}:${revealed}` : step.phase
  const grand = step.phase === 'award' && revealed && awards[step.index].key === 'praesident'

  return (
    <main className="absolute inset-0 flex items-center justify-center bg-rauten p-12">
      <div
        key={key}
        className={cx(
          'sign stagger flex max-h-full w-full max-w-[110rem] flex-col items-center gap-8 overflow-hidden px-16 py-12 text-center',
          revealed ? 'animate-flip-in' : 'animate-sign-drop',
        )}
      >
        {step.phase === 'intro' && <Intro awards={awards.length} />}
        {step.phase === 'award' && (
          <AwardCard award={awards[step.index]} index={step.index} of={awards.length} revealed={revealed} members={members} />
        )}
        {step.phase === 'standings' && <Standings members={members} drinks={drinks} strafen={strafen} points={points} awards={awards} />}
      </div>
      {grand && <div key={key} className="pointer-events-none absolute inset-0 animate-flash bg-messing" />}
    </main>
  )
}
