// React hooks over the stores in this folder, and the Realtime-backed data hooks. Pattern: fetch
// once, apply Realtime payloads, refetch on every (re)subscribe and when the tab becomes visible
// again, retry failed fetches with backoff.
import { useCallback, useEffect, useEffectEvent, useState, useSyncExternalStore } from 'react'
import { measureOffset, serverTime, usableOffset } from './clock'
import { connectionStore, type ConnectionStatus } from './connection'
import { PrositError, toPrositError } from './errors'
import { identityStore, type Identity } from './identity'
import { applyChange, type RowChange } from './realtime'
import { getApi, getSupabase } from './supabase'
import {
  toDrink,
  toEvent,
  toMember,
  toNight,
  toPoints,
  toStrafe,
  type DrinkRow,
  type EventRow,
  type MemberRow,
  type NightRow,
  type PointsRow,
  type ResponseRow,
  type StrafeRow,
} from './types'

export interface LiveResult<T> {
  /** undefined until the first successful fetch. */
  data: T | undefined
  /** Latest fetch error; cleared by the next success. Retries continue in the background. */
  error: PrositError | null
  reload: () => void
}

export interface LiveHookOptions {
  /**
   * Also refetch every pollMs while the tab is visible. A safety net for a socket that died
   * without telling anyone: the heartbeat only notices after a while, and a push missed in that
   * gap is gone for good (Realtime has no replay). The TV uses it, since nobody reloads a TV.
   */
  pollMs?: number
}

interface LiveOptions<T> extends LiveHookOptions {
  /** Identity of the query; null disables it. A new key refetches and resubscribes. */
  key: string | null
  load: () => Promise<T>
  /** Tables to watch (all in schema public). Empty: fetch only. */
  tables: readonly string[]
  /** Merge a change into the current data. Omit to refetch on every change. */
  apply?: (prev: T, change: RowChange) => T
}

const RETRY_MS = [1000, 2000, 4000, 8000, 10000]
const REFETCH_DEBOUNCE_MS = 150

function useLive<T>({ key, load, tables, apply, pollMs }: LiveOptions<T>): LiveResult<T> {
  const [state, setState] = useState<{ key: string | null; data: T | undefined; error: PrositError | null }>({
    key,
    data: undefined,
    error: null,
  })
  const [reloadTick, setReloadTick] = useState(0)
  const tablesKey = tables.join(',')

  const doLoad = useEffectEvent(() => load())
  const doApply = useEffectEvent((prev: T, change: RowChange) => (apply ? apply(prev, change) : prev))
  const hasApply = apply !== undefined

  useEffect(() => {
    if (key === null) return
    let cancelled = false
    let attempt = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    const channelId = `${key}:${Math.random().toString(36).slice(2)}`
    // Latest data this subscription fetched or merged. Changes are merged here, outside the state
    // updater: React may run updaters during render, where effect events must not be called.
    let current: T | undefined
    // Fetches can overlap (a slow one, then a change or a poll). Only the newest may land, or a
    // stale list could overwrite a fresh one.
    let seq = 0

    const fetchNow = async () => {
      clearTimeout(timer)
      const mine = ++seq
      try {
        const data = await doLoad()
        if (cancelled || mine !== seq) return
        attempt = 0
        connectionStore.reportFetch(true)
        current = data
        setState({ key, data, error: null })
      } catch (err) {
        if (cancelled || mine !== seq) return
        const error = toPrositError(err)
        if (error.code === 'network') connectionStore.reportFetch(false)
        setState((s) => ({ key, data: s.key === key ? s.data : undefined, error }))
        if (error.code !== 'config') {
          timer = setTimeout(fetchNow, RETRY_MS[Math.min(attempt++, RETRY_MS.length - 1)])
        }
      }
    }
    const scheduleFetch = () => {
      clearTimeout(timer)
      timer = setTimeout(fetchNow, REFETCH_DEBOUNCE_MS)
    }

    let removeChannel = () => {}
    const tableList = tablesKey ? tablesKey.split(',') : []
    if (tableList.length === 0) {
      void fetchNow()
    } else {
      try {
        const db = getSupabase()
        let channel = db.channel(`live:${channelId}`)
        for (const table of tableList) {
          channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
            if (cancelled) return
            if (!hasApply) return scheduleFetch()
            // Before the first fetch there is nothing to merge into; that fetch includes the change.
            if (current === undefined) return
            const next = doApply(current, payload as unknown as RowChange)
            if (next === current) return
            current = next
            setState((s) => (s.key === key ? { ...s, data: next } : s))
          })
        }
        // Changes only flow once Postgres confirms (after SUBSCRIBED); refetch then to close the gap.
        channel = channel.on('system', {}, (payload: { extension?: string; status?: string }) => {
          if (!cancelled && payload.extension === 'postgres_changes' && payload.status === 'ok') scheduleFetch()
        })
        channel.subscribe((status) => {
          if (cancelled) return
          connectionStore.reportChannel(channelId, status)
          if (status === 'SUBSCRIBED') void fetchNow()
        })
        removeChannel = () => {
          connectionStore.reportChannel(channelId, null)
          void db.removeChannel(channel)
        }
      } catch {
        // Missing config: the fetch fails the same way and reports it.
        void fetchNow()
      }
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') scheduleFetch()
    }
    document.addEventListener('visibilitychange', onVisible)
    const poll = pollMs
      ? setInterval(() => {
          if (document.visibilityState === 'visible') scheduleFetch()
        }, pollMs)
      : undefined

    return () => {
      cancelled = true
      clearTimeout(timer)
      clearInterval(poll)
      document.removeEventListener('visibilitychange', onVisible)
      removeChannel()
    }
  }, [key, tablesKey, hasApply, pollMs, reloadTick])

  const reload = useCallback(() => setReloadTick((t) => t + 1), [])
  const current = state.key === key
  return { data: current ? state.data : undefined, error: current ? state.error : null, reload }
}

/** applyChange, then keep the list ordered. Returns `prev` untouched when nothing changed. */
function applySorted<T extends { id: string }>(
  prev: T[],
  change: RowChange,
  toRow: (raw: Record<string, unknown>) => T,
  order: (row: T) => number,
): T[] {
  const next = applyChange(prev, change, toRow)
  return next === prev ? prev : next.slice().sort((a, b) => order(a) - order(b))
}

// Stores -------------------------------------------------------------------------------------

export function useConnection(): ConnectionStatus {
  return useSyncExternalStore(connectionStore.subscribe, connectionStore.getSnapshot, () => 'connecting')
}

/** This device's member identity, or null before joining. */
export function useIdentity(): Identity | null {
  return useSyncExternalStore(identityStore.subscribe, identityStore.get, () => null)
}

// Data ---------------------------------------------------------------------------------------

/** The night singleton: status, seed, start time and event interval. */
export function useNight(options: LiveHookOptions = {}): LiveResult<NightRow> {
  return useLive({
    key: 'night',
    load: () => getApi().getNight(),
    tables: ['night'],
    apply: (prev, change) => (change.eventType === 'DELETE' ? prev : toNight(change.new)),
    ...options,
  })
}

/** Every member, in joining order. */
export function useMembers(options: LiveHookOptions = {}): LiveResult<MemberRow[]> {
  return useLive({
    key: 'members',
    load: () => getApi().getMembers(),
    tables: ['members'],
    apply: (prev, change) => applySorted(prev, change, toMember, (m) => m.createdAt),
    ...options,
  })
}

/** The whole drink log, oldest first. An undo arrives as a DELETE. */
export function useDrinks(options: LiveHookOptions = {}): LiveResult<DrinkRow[]> {
  return useLive({
    key: 'drinks',
    load: () => getApi().getDrinks(),
    tables: ['drinks'],
    apply: (prev, change) => applySorted(prev, change, toDrink, (d) => d.at),
    ...options,
  })
}

/** Every event of the night, by seq. A resolution arrives as an UPDATE. */
export function useEvents(options: LiveHookOptions = {}): LiveResult<EventRow[]> {
  return useLive({
    key: 'events',
    load: () => getApi().getEvents(),
    tables: ['events'],
    apply: (prev, change) => applySorted(prev, change, toEvent, (e) => e.seq),
    ...options,
  })
}

/**
 * The answers to one event, oldest first. null: no event, no query. Refetched on every change to
 * the table rather than merged: answers are few, and a merge would need a filter per event.
 */
export function useResponses(eventId: string | null, options: LiveHookOptions = {}): LiveResult<ResponseRow[]> {
  return useLive({
    key: eventId === null ? null : `responses:${eventId}`,
    load: () => getApi().getResponses(eventId!),
    tables: ['responses'],
    ...options,
  })
}

/** Every Strafe, oldest first. */
export function useStrafen(options: LiveHookOptions = {}): LiveResult<StrafeRow[]> {
  return useLive({
    key: 'strafen',
    load: () => getApi().getStrafen(),
    tables: ['strafen'],
    apply: (prev, change) => applySorted(prev, change, toStrafe, (s) => s.at),
    ...options,
  })
}

/** Every points award, oldest first. */
export function usePoints(options: LiveHookOptions = {}): LiveResult<PointsRow[]> {
  return useLive({
    key: 'points',
    load: () => getApi().getPoints(),
    tables: ['points'],
    apply: (prev, change) => applySorted(prev, change, toPoints, (p) => p.at),
    ...options,
  })
}

export interface Me {
  identity: Identity | null
  /** This device's member row. undefined while unknown, null when there is none. */
  me: MemberRow | null | undefined
}

/**
 * This device's member, looked up in the list from useMembers(). If the row is gone from the
 * database (reset_night with wipe) the identity is cleared, which sends the phone back to joining.
 */
export function useMe(members: readonly MemberRow[] | undefined): Me {
  const identity = useIdentity()
  const memberId = identity?.memberId ?? null
  const me = memberId === null ? null : members ? (members.find((m) => m.id === memberId) ?? null) : undefined
  const missing = memberId !== null && me === null

  useEffect(() => {
    if (!missing || memberId === null) return
    let cancelled = false
    // The list can lag right after joining, so ask the database before forgetting who we are.
    getApi()
      .getMember(memberId)
      .then((row) => {
        if (!cancelled && row === null && identityStore.get()?.memberId === memberId) identityStore.clear()
      })
      .catch(() => {
        // Offline or misconfigured: keep the identity, the list hook reports the error.
      })
    return () => {
      cancelled = true
    }
  }, [missing, memberId])

  return { identity, me: missing ? undefined : me }
}

// Clock --------------------------------------------------------------------------------------

/**
 * Offset from this device's clock to the database clock, measured once and re-measured when the
 * connection comes back. Drinks and events carry server timestamps, so the TV and the phones need
 * to agree on "now" even if a device clock drifts. A failed measurement leaves the offset at 0,
 * i.e. plain local time.
 */
export function useServerClock(): { now: () => number; offset: number } {
  const [offset, setOffset] = useState(0)
  const status = useConnection()
  const online = status === 'online'

  useEffect(() => {
    if (!online) return
    let cancelled = false
    const measure = async () => {
      const sentAt = Date.now()
      try {
        const serverMs = await getApi().serverNow()
        if (!cancelled) setOffset(usableOffset(measureOffset(serverMs, sentAt, Date.now())))
      } catch {
        // Keep the current offset; the local clock is the fallback.
      }
    }
    void measure()
    return () => {
      cancelled = true
    }
  }, [online])

  const now = useCallback(() => serverTime(offset), [offset])
  return { now, offset }
}

/** Server time as state, refreshed every `everyMs`. For clocks and timelines that move on their own. */
export function useServerNow(everyMs: number): number {
  const { now } = useServerClock()
  const [value, setValue] = useState(() => now())

  useEffect(() => {
    const timer = setInterval(() => setValue(now()), everyMs)
    return () => clearInterval(timer)
  }, [now, everyMs])

  return value
}
