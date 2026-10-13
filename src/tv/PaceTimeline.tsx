import { useMemo } from 'react'
import type { DrinkRow, MemberRow, NightRow } from '../lib/types'
import { TV_PACE } from '../shared/content/tv'
import { paceSeries } from '../shared/game/drinks'
import { fmtLitres } from '../shared/game/format'
import { Panel } from './Panel'
import { fmtTime } from './time'

const W = 700
const H = 250
const STEPS = 60
/** Redraw the "now" edge at most this often, so the lines do not shimmer every second. */
const NOW_STEP_MS = 15_000
/** Lead-in before the first drink when the night was never started, so its line rises from zero. */
const LEAD_MS = 60_000
/** The x axis never spans less than this, so the first drink is not a vertical wall. */
const MIN_SPAN_MS = 10 * 60_000

interface PaceTimelineProps {
  night: NightRow
  members: readonly MemberRow[]
  drinks: readonly DrinkRow[]
  /** Server time, ms. */
  now: number
}

/** Each member's running total over the night, from the start (or the first drink) until now. */
export function PaceTimeline({ night, members, drinks, now }: PaceTimelineProps) {
  const firstAt = drinks.length > 0 ? drinks[0].at : null
  const start = Math.min(night.startedAt ?? Infinity, firstAt === null ? Infinity : firstAt - LEAD_MS)
  const steppedNow = Math.ceil(now / NOW_STEP_MS) * NOW_STEP_MS
  const end = Math.max(night.endedAt ?? steppedNow, start + MIN_SPAN_MS)

  const series = useMemo(
    () =>
      Number.isFinite(start)
        ? paceSeries(
            drinks,
            members.map((m) => m.id),
            start,
            end,
            STEPS,
          )
        : null,
    [drinks, members, start, end],
  )

  if (!series || firstAt === null) {
    return (
      <Panel title={TV_PACE.title}>
        <p className="my-auto text-center text-tv-sm text-weste-dim">{TV_PACE.empty}</p>
      </Panel>
    )
  }

  const maxCl = Math.max(100, ...members.map((m) => series.cl[m.id]?.at(-1) ?? 0))
  // While the axis is still padded out to MIN_SPAN_MS, the lines stop at now.
  const padded = end > steppedNow
  const drawn = padded ? Math.max(2, series.times.filter((t) => t <= steppedNow).length) : series.times.length
  const x = (i: number) => (i / STEPS) * W
  const y = (cl: number) => H - (cl / maxCl) * (H - 8) - 4

  return (
    <Panel title={TV_PACE.title}>
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={TV_PACE.title} className="min-h-0 w-full flex-1">
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <line key={f} x1={0} x2={W} y1={y(maxCl * f)} y2={y(maxCl * f)} stroke="var(--color-koenig)" strokeOpacity={0.3} strokeWidth={1} strokeDasharray="4 8" vectorEffect="non-scaling-stroke" />
          ))}
          {members.map((m) => (
            <polyline
              key={m.id}
              points={(series.cl[m.id] ?? [])
                .slice(0, drawn)
                .map((cl, i) => `${x(i)},${y(cl)}`)
                .join(' ')}
              fill="none"
              stroke={m.colour}
              strokeWidth={5}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        <div className="flex justify-between text-xl font-bold text-weste-dim tabular-nums">
          <span>
            {TV_PACE.start} {fmtTime(start)}
          </span>
          <span>
            {fmtLitres(maxCl)} {TV_PACE.axis}
          </span>
          <span>
            {padded ? fmtTime(end) : `${TV_PACE.now} ${fmtTime(end)}`}
          </span>
        </div>
      </div>
    </Panel>
  )
}
