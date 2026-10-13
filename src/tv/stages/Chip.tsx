import type { EventRow, MemberRow } from '../../lib/types'
import { cx } from '../../ui'

export interface StageProps {
  event: EventRow
  members: readonly MemberRow[]
  /** Server time. */
  now: number
}

interface ChipProps {
  member: MemberRow
  /** Filled in the member's colour: has answered, or is the one being named. */
  on: boolean
  order?: number
  /** Shown after the name, in body type: a guess, a count of votes. */
  note?: string
}

/** A member on the stage. */
export function Chip({ member, on, order, note }: ChipProps) {
  return (
    <li
      style={on ? { backgroundColor: member.colour, borderColor: member.colour } : { color: member.colour }}
      className={cx(
        'flex items-center gap-3 rounded-lg border-4 px-6 py-3 font-display text-tv-md leading-none font-bold',
        on ? 'animate-chip-pop text-white' : 'border-current bg-card opacity-60',
      )}
    >
      {order !== undefined && <span className="font-body text-tv-sm font-black tabular-nums">{order}.</span>}
      {member.name}
      {note !== undefined && <span className="font-body text-tv-sm font-black tabular-nums">{note}</span>}
    </li>
  )
}
