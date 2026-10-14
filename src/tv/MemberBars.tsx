import { DRINK_ICONS, DRINK_LABELS } from '../shared/content/drinks'
import { TV_BARS, TV_CROWN } from '../shared/content/tv'
import type { MemberRow } from '../lib/types'
import { CENTILITRES, NOBLE_KINDS, rankTallies, type Tally } from '../shared/game/drinks'
import { fmtLitres } from '../shared/game/format'
import { DRINK_KINDS } from '../shared/game/types'
import { Panel } from './Panel'

// One member colour per bar; the kinds are told apart by how solid the segment is.
const SEGMENT_OPACITY = { ol: 1, mass: 0.7, schnaps: 0.4 } as const

interface MemberBarsProps {
  members: readonly MemberRow[]
  tallies: readonly Tally[]
  strafeCounts: Record<string, number>
  pointCounts: Record<string, number>
  /** Who leads the points (pointLeaders): they wear the crown. */
  leaders: readonly string[]
}

/** A brass crown, drawn rather than an emoji, so it matches the crest. */
function Crown() {
  return (
    <svg viewBox="0 0 24 18" role="img" aria-label={TV_CROWN.label} className="h-[0.8em] w-auto shrink-0 animate-thud self-center">
      <path d="M2 16h20l1.5-11-6 4.5L12 1 6.5 9.5l-6-4.5z" className="fill-messing stroke-messing-deep" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="12" cy="11" r="1.6" className="fill-strafe" />
    </svg>
  )
}

/** The standings: one bar per member, longest first, stacked by drink kind. */
export function MemberBars({ members, tallies, strafeCounts, pointCounts, leaders }: MemberBarsProps) {
  const ranked = rankTallies(tallies)
  const maxCl = Math.max(100, ...ranked.map((t) => t.cl))

  return (
    <Panel title={TV_BARS.title}>
      <ol className="flex min-h-0 flex-1 flex-col justify-around gap-3">
        {ranked.map((t) => {
          const member = members.find((m) => m.id === t.memberId)
          if (!member) return null
          const strafen = strafeCounts[member.id] ?? 0
          const points = pointCounts[member.id] ?? 0
          return (
            <li key={member.id} className="flex min-h-0 flex-col gap-1.5">
              <div className="flex items-baseline gap-5">
                <span className="flex min-w-0 items-baseline gap-3 font-display text-tv-md leading-none font-bold" style={{ color: member.colour }}>
                  {leaders.includes(member.id) && <Crown />}
                  <span className="truncate">{member.name}</span>
                </span>
                <span className="flex gap-4 text-xl font-bold whitespace-nowrap text-weste-dim tabular-nums">
                  {DRINK_KINDS.map((kind) => (
                    <span key={kind} aria-label={`${DRINK_LABELS[kind]}: ${t.counts[kind]}`}>
                      <span aria-hidden>{DRINK_ICONS[kind]}</span> {t.counts[kind]}
                    </span>
                  ))}
                </span>
                {points > 0 && (
                  <span className="rounded-md bg-koenig px-4 py-1 text-xl font-black whitespace-nowrap text-white tabular-nums">
                    {TV_BARS.points(points)}
                  </span>
                )}
                {strafen > 0 && (
                  <span className="rounded-md bg-strafe px-4 py-1 text-xl font-black whitespace-nowrap text-white tabular-nums">
                    {strafen} ⚖
                  </span>
                )}
                <span className="ml-auto text-tv-md leading-none font-black whitespace-nowrap text-koenig tabular-nums">
                  {t.cl > 0 ? (
                    <>
                      {fmtLitres(t.cl, 2)} <span className="text-tv-sm text-weste-dim">{TV_BARS.litres}</span>
                    </>
                  ) : (
                    <span className="text-tv-sm font-bold text-weste-dim">{TV_BARS.noDrinks}</span>
                  )}
                </span>
              </div>
              <div className="flex h-7 overflow-hidden rounded-sm bg-paper-deep">
                {NOBLE_KINDS.map((kind) => (
                  <div
                    key={kind}
                    className="h-full transition-[width] duration-700 ease-out"
                    style={{
                      width: `${((t.counts[kind] * CENTILITRES[kind]) / maxCl) * 100}%`,
                      backgroundColor: member.colour,
                      opacity: SEGMENT_OPACITY[kind],
                    }}
                  />
                ))}
              </div>
            </li>
          )
        })}
      </ol>
    </Panel>
  )
}
