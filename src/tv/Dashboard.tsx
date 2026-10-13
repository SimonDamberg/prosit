import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import type { ConnectionStatus } from '../lib/connection'
import { useServerNow } from '../lib/hooks'
import type { DrinkRow, MemberRow, NightRow, StrafeRow } from '../lib/types'
import { TV_EMPTY, TV_ENDED, TV_JOIN, TV_STRAFEN, TV_TOTALS } from '../shared/content/tv'
import { BRAND } from '../shared/content/ui'
import { strafeTally, sumTallies, tallyDrinks } from '../shared/game/drinks'
import { fmtLitres } from '../shared/game/format'
import { ConnectionBadge, QrCode, RollingNumber, toast } from '../ui'
import { MemberBars } from './MemberBars'
import { PaceTimeline } from './PaceTimeline'
import { StrafeRegister } from './StrafeRegister'
import { fmtTime } from './time'

interface DashboardProps {
  night: NightRow
  members: readonly MemberRow[]
  drinks: readonly DrinkRow[]
  strafen: readonly StrafeRow[]
  connection: ConnectionStatus
}

function Total({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-1 items-baseline justify-center gap-4 rounded-3xl bg-night-deep/60 px-6 py-4">
      <span className="font-display text-tv-lg leading-none font-black text-plate tabular-nums">{children}</span>
      <span className="text-xl font-bold tracking-[0.12em] text-ink-dim uppercase">{label}</span>
    </div>
  )
}

/** Announces each Strafe that arrives after the dashboard loaded. */
function useStrafeToasts(strafen: readonly StrafeRow[], members: readonly MemberRow[]) {
  const seen = useRef<Set<string> | null>(null)
  useEffect(() => {
    const first = seen.current === null
    const known = (seen.current ??= new Set())
    for (const s of strafen) {
      if (known.has(s.id)) continue
      known.add(s.id)
      const name = members.find((m) => m.id === s.memberId)?.name
      if (!first && name) toast({ text: TV_STRAFEN.toast(name, s.reason), tone: 'error', ms: 8000 })
    }
  }, [strafen, members])
}

export function Dashboard({ night, members, drinks, strafen, connection }: DashboardProps) {
  const now = useServerNow(1000)
  useStrafeToasts(strafen, members)

  const tallies = useMemo(
    () =>
      tallyDrinks(
        drinks,
        members.map((m) => m.id),
      ),
    [drinks, members],
  )
  const total = useMemo(() => sumTallies(tallies), [tallies])
  const strafeCounts = useMemo(() => strafeTally(strafen), [strafen])
  const ended = night.status === 'ended'
  const joinUrl = window.location.origin

  return (
    <main className="flex h-full flex-col gap-6 overflow-hidden p-10">
      <header className="flex items-center gap-8">
        <div className="flex min-w-0 flex-1 items-baseline gap-8">
          <h1 className="font-display text-tv-xl leading-none font-black text-plate uppercase">{BRAND.name}</h1>
          <p className="truncate text-tv-sm font-bold tracking-[0.15em] text-ink-dim uppercase">
            {ended ? TV_ENDED : `${BRAND.club} · ${BRAND.tagline}`}
          </p>
        </div>
        <ConnectionBadge status={connection} size="tv" />
        <p className="font-display text-tv-lg leading-none font-black tabular-nums">{fmtTime(now)}</p>
        {members.length > 0 && !ended && (
          <div className="flex items-center gap-4">
            <p className="font-display text-tv-sm leading-none font-black text-ink-dim uppercase">{TV_JOIN.corner}</p>
            <QrCode value={joinUrl} label={TV_JOIN.qrLabel} className="size-28 shrink-0 rounded-xl" />
          </div>
        )}
      </header>

      {members.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center gap-20">
          <div className="flex max-w-3xl flex-col gap-6">
            <p className="text-tv-sm font-bold tracking-[0.15em] text-sleaze uppercase">{TV_EMPTY.title}</p>
            <h2 className="font-display text-tv-xl leading-none font-black uppercase">{TV_JOIN.title}</h2>
            <p className="text-tv-md text-ink-dim">{TV_EMPTY.text}</p>
            <p className="text-tv-sm text-ink-dim">{TV_JOIN.text}</p>
          </div>
          <QrCode value={joinUrl} label={TV_JOIN.qrLabel} className="size-[30rem] shrink-0 rounded-3xl" />
        </div>
      ) : (
        <>
          <div className="grid min-h-0 flex-1 grid-cols-[3fr_2fr] gap-6">
            <MemberBars members={members} tallies={tallies} strafeCounts={strafeCounts} />
            <div className="grid min-h-0 grid-rows-2 gap-6">
              <PaceTimeline night={night} members={members} drinks={drinks} now={now} />
              <StrafeRegister members={members} strafen={strafen} />
            </div>
          </div>
          <footer className="flex gap-6">
            <Total label={TV_TOTALS.litres}>{fmtLitres(total.cl)}</Total>
            <Total label={TV_TOTALS.drinks}>
              <RollingNumber value={total.drinks} />
            </Total>
            <Total label={TV_TOTALS.wasser}>
              <RollingNumber value={total.counts.wasser} />
            </Total>
            <Total label={TV_TOTALS.strafen}>
              <RollingNumber value={strafen.length} />
            </Total>
          </footer>
        </>
      )}
    </main>
  )
}
