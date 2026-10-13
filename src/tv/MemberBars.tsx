import { DRINK_ICONS, DRINK_LABELS } from '../shared/content/drinks'
import { TV_BARS } from '../shared/content/tv'
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
}

/** The standings: one bar per member, longest first, stacked by drink kind. */
export function MemberBars({ members, tallies, strafeCounts }: MemberBarsProps) {
  const ranked = rankTallies(tallies)
  const maxCl = Math.max(100, ...ranked.map((t) => t.cl))

  return (
    <Panel title={TV_BARS.title}>
      <ol className="flex min-h-0 flex-1 flex-col justify-around gap-3">
        {ranked.map((t) => {
          const member = members.find((m) => m.id === t.memberId)
          if (!member) return null
          const strafen = strafeCounts[member.id] ?? 0
          return (
            <li key={member.id} className="flex min-h-0 flex-col gap-1.5">
              <div className="flex items-baseline gap-5">
                <span className="min-w-0 truncate font-display text-tv-md leading-none font-black uppercase" style={{ color: member.colour }}>
                  {member.name}
                </span>
                <span className="flex gap-4 text-xl font-bold whitespace-nowrap text-ink-dim tabular-nums">
                  {DRINK_KINDS.map((kind) => (
                    <span key={kind} aria-label={`${DRINK_LABELS[kind]}: ${t.counts[kind]}`}>
                      <span aria-hidden>{DRINK_ICONS[kind]}</span> {t.counts[kind]}
                    </span>
                  ))}
                </span>
                {strafen > 0 && (
                  <span className="rounded-full bg-drift px-4 py-1 text-xl font-black whitespace-nowrap text-white tabular-nums">
                    {strafen} ⚖
                  </span>
                )}
                <span className="ml-auto font-display text-tv-md leading-none font-black whitespace-nowrap tabular-nums">
                  {t.cl > 0 ? (
                    <>
                      {fmtLitres(t.cl, 2)} <span className="text-tv-sm text-ink-dim">{TV_BARS.litres}</span>
                    </>
                  ) : (
                    <span className="text-tv-sm text-ink-dim uppercase">{TV_BARS.noDrinks}</span>
                  )}
                </span>
              </div>
              <div className="flex h-7 overflow-hidden rounded-full bg-night-deep/70">
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
