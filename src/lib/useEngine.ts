// The event engine. There is no server process and no game master, so every connected client runs
// this: the phones as their member, the TV (which never sleeps) as nobody. They all decide the same
// thing from the same rows (src/shared/game/schedule.ts and resolve.ts) and race to write it; the
// database lets the first one through and turns the rest into no-ops.
import { useCallback, useEffect, useRef } from 'react'
import { resolve } from '../shared/game/resolve'
import { ANSWERED_KINDS, nextAction } from '../shared/game/schedule'
import { useServerClock } from './hooks'
import { getApi } from './supabase'
import type { EventKind } from '../shared/game/types'
import type { EventRow, Identity, MemberRow, NightRow } from './types'

const TICK_MS = 1500

export interface EngineInput {
  night: NightRow | undefined
  events: readonly EventRow[] | undefined
  members: readonly MemberRow[] | undefined
}

export interface Engine {
  /** Opens the next event without waiting for its time, as `kind` if given. For the dev buttons. */
  triggerNow: (kind?: EventKind) => Promise<void>
}

/**
 * Ticks on server time and spawns or resolves events when they are due. `who` is null on the TV.
 * The rows come from the caller's own hooks, so the engine adds no subscriptions.
 */
export function useEngine(who: Identity | null, input: EngineInput, enabled = true): Engine {
  const { now } = useServerClock()
  const latest = useRef({ who, input, now })
  useEffect(() => {
    latest.current = { who, input, now }
  })
  const busy = useRef(false)

  const tick = useCallback(async (force: boolean | EventKind = false) => {
    const { who, input, now } = latest.current
    const { night, events } = input
    let members = input.members
    if (busy.current || !night || !events || !members) return
    busy.current = true
    try {
      const api = getApi()
      // Answers decide when an event may close and how, so they are read fresh, never from a
      // hook that may lag: every racer must resolve from the same rows.
      const open = events.filter((e) => e.status === 'live' && ANSWERED_KINDS.includes(e.kind))
      const answers = (await Promise.all(open.map((e) => api.getResponses(e.id)))).flat()
      if (open.length > 0) members = await api.getMembers()
      const memberIds = members.map((m) => m.id)

      const action = nextAction({ night, events, memberIds, responses: answers }, now(), force)
      if (action.type === 'spawn') {
        await api.spawnEvent(who, action.plan.seq, action.plan.payload, action.endsAt)
      } else if (action.type === 'resolve') {
        const event = events.find((e) => e.id === action.event.id)
        if (!event) return
        const mine = answers.filter((a) => a.eventId === event.id)
        await api.resolveEvent(who, event.id, resolve(event.payload, mine, memberIds))
      }
    } catch {
      // Offline, or another client got there first: the next tick looks again.
    } finally {
      busy.current = false
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    const timer = setInterval(() => void tick(), TICK_MS)
    return () => clearInterval(timer)
  }, [enabled, tick])

  const triggerNow = useCallback((kind?: EventKind) => tick(kind ?? true), [tick])
  return { triggerNow }
}
