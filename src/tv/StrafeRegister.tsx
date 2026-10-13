import type { MemberRow, StrafeRow } from '../lib/types'
import { TV_STRAFEN } from '../shared/content/tv'
import { Panel } from './Panel'
import { fmtTime } from './time'

const SHOWN = 4

/** The latest Strafen, newest first. The count per member sits on the bars. */
export function StrafeRegister({ members, strafen }: { members: readonly MemberRow[]; strafen: readonly StrafeRow[] }) {
  const latest = strafen.slice(-SHOWN).reverse()
  const member = (id: string) => members.find((m) => m.id === id)

  return (
    <Panel title={TV_STRAFEN.title}>
      {latest.length === 0 ? (
        <p className="my-auto text-center text-tv-sm text-ink-dim">{TV_STRAFEN.none}</p>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col justify-around gap-2 overflow-hidden">
          {latest.map((s) => {
            const m = member(s.memberId)
            return (
              <li key={s.id} className="flex animate-toast-in items-baseline gap-4 border-l-8 border-drift pl-4">
                <span className="text-xl font-bold text-ink-dim tabular-nums">{fmtTime(s.at)}</span>
                <span className="shrink-0 font-display text-tv-sm leading-none font-black uppercase" style={{ color: m?.colour }}>
                  {m?.name ?? '?'}
                </span>
                <span className="min-w-0 truncate text-tv-sm leading-tight">{s.reason}</span>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
