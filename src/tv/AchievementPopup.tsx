import { useEffect, useRef, useState } from 'react'
import type { MemberRow } from '../lib/types'
import { ACHIEVEMENT_KICKER, ACHIEVEMENTS } from '../shared/content/achievements'
import type { Achievement } from '../shared/game/achievements'
import { play } from './audio'
import { say } from './herold'
import { HEROLD } from '../shared/content/tv'

/** How long one achievement stays up. */
const SHOW_MS = 6_000
/** A breath between two, so they read as two. */
const GAP_MS = 600

interface AchievementPopupProps {
  achievements: readonly Achievement[]
  members: readonly MemberRow[]
  /** An event has the stage: the queue waits until it is gone. */
  held: boolean
}

/**
 * Announces each achievement earned after the dashboard loaded, one at a time, in a corner of the
 * dashboard. What was earned before the TV loaded is not announced again.
 */
export function AchievementPopup({ achievements, members, held }: AchievementPopupProps) {
  const seen = useRef<Set<string> | null>(null)
  const queue = useRef<Achievement[]>([])
  const [current, setCurrent] = useState<Achievement | null>(null)

  useEffect(() => {
    const first = seen.current === null
    const known = (seen.current ??= new Set())
    for (const a of achievements) {
      if (known.has(a.id)) continue
      known.add(a.id)
      if (!first) queue.current.push(a)
    }
  }, [achievements])

  // Runs after the effect above in the same commit, so a new arrival is already queued.
  useEffect(() => {
    if (current || held) return
    const timer = setTimeout(() => {
      const next = queue.current.shift()
      if (!next) return
      setCurrent(next)
      play('medaille')
      const name = members.find((m) => m.id === next.memberId)?.name
      if (name) say(HEROLD.achievement(ACHIEVEMENTS[next.key].title, name), 1000)
    }, GAP_MS)
    return () => clearTimeout(timer)
  }, [current, held, achievements, members])

  useEffect(() => {
    if (!current) return
    const timer = setTimeout(() => setCurrent(null), SHOW_MS)
    return () => clearTimeout(timer)
  }, [current])

  const member = current && members.find((m) => m.id === current.memberId)
  if (!current || !member || held) return null
  const copy = ACHIEVEMENTS[current.key]
  return (
    <div
      key={current.id}
      className="sign absolute right-10 bottom-32 z-10 flex w-[min(44rem,40vw)] animate-from-right flex-col gap-2 border-messing-deep! px-8 py-6"
    >
      <p className="text-xl font-bold tracking-[0.18em] text-messing-deep uppercase">{ACHIEVEMENT_KICKER}</p>
      <p className="font-display text-tv-lg leading-none font-bold text-koenig">{copy.title}</p>
      <p className="text-tv-sm font-bold" style={{ color: member.colour }}>
        {copy.line(member.name)}
      </p>
    </div>
  )
}
