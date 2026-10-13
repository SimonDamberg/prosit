// The event schedule and the engine's decision, both pure. Every connected client computes the
// same plan for event N from the night's seed, so whichever client writes first writes what the
// others would have written.
import { RULES } from '../content/rules'
import { createRng } from './rng'
import type { EventKind, EventPayload, EventStatus, NightStatus } from './types'

/** Kinds the schedule may draw. Stage 4 adds the rest as they get a resolver and a screen. */
export const ENABLED_KINDS: readonly EventKind[] = ['prosit', 'regel']

/** A Regel holds in the background: the next event may start while it is still in force. */
export const NON_BLOCKING_KINDS: readonly EventKind[] = ['regel']

/** Kinds that end early once every member has answered. */
export const ANSWERED_KINDS: readonly EventKind[] = ['prosit']

export const PROSIT_MS = 60_000
export const REGEL_MS = 10 * 60_000
/** The wait before an event is the interval times a factor in this range: 8 to 15 min at 12. */
export const GAP_MIN = 0.67
export const GAP_MAX = 1.25
/** After a deadline, before resolving: lets the last answers land in every client's fetch. */
export const RESOLVE_GRACE_MS = 1000
/** After a blocking event resolves, the result owns the screens for this long. */
export const RESULT_MS = 12_000

export interface EventPlan {
  seq: number
  kind: EventKind
  payload: EventPayload
  /** Wait from the previous event's start (or the night's start) until this one is due. */
  gapMs: number
  /** How long the event stays open. */
  durationMs: number
}

/**
 * Event `seq` (from 1) of the night with this seed. The kind never repeats the previous one, and
 * the rules come out of a seed-shuffled pool, so none repeats until all have been used.
 * Texts are copied into the payload: an event stays readable even if the pool changes.
 */
export function planEvent(seed: number, seq: number, intervalMin: number): EventPlan {
  let prev: EventKind | null = null
  let rules = 0
  let rng = createRng(seed)
  let kind: EventKind = ENABLED_KINDS[0]
  for (let n = 1; n <= seq; n++) {
    if (prev === 'regel') rules++
    rng = createRng(seed + n)
    const options = ENABLED_KINDS.filter((k) => k !== prev)
    kind = rng.pick(options.length > 0 ? options : ENABLED_KINDS)
    prev = kind
  }

  const intervalMs = intervalMin * 60_000
  const gapMs = Math.round(intervalMs * rng.float(GAP_MIN, GAP_MAX))
  // Capped at one interval, so a night on a very short (test) interval keeps moving.
  const lasts = (ms: number) => Math.round(Math.min(ms, intervalMs))

  switch (kind) {
    case 'prosit':
      return { seq, kind, payload: { kind }, gapMs, durationMs: lasts(PROSIT_MS) }
    case 'regel': {
      const pool = createRng(seed).shuffle(RULES)
      return { seq, kind, payload: { kind, rule: pool[rules % pool.length] }, gapMs, durationMs: lasts(REGEL_MS) }
    }
    default:
      throw new Error(`schedule: ${kind} is not enabled`)
  }
}

/**
 * `count` different members for pick number `turn` (from 0) of the night. Members come up in
 * seeded rounds, each once per round, so nobody is picked twice before everyone has been.
 */
export function pickFair(seed: number, memberIds: readonly string[], turn: number, count = 1): string[] {
  const ids = [...new Set(memberIds)].sort()
  if (ids.length === 0) return []
  const want = Math.min(count, ids.length)
  const picked: string[] = []
  // A pick that straddles two rounds can meet the same member twice; skip the repeat.
  for (let i = turn * count; picked.length < want; i++) {
    const round = Math.floor(i / ids.length)
    const id = createRng(seed + 1_000_003 * (round + 1)).shuffle(ids)[i % ids.length]
    if (!picked.includes(id)) picked.push(id)
  }
  return picked
}

// The engine ---------------------------------------------------------------------------------

export interface EngineNight {
  status: NightStatus
  seed: number | null
  startedAt: number | null
  intervalMin: number
}

export interface EngineEvent {
  id: string
  seq: number
  kind: EventKind
  startedAt: number
  endsAt: number
  status: EventStatus
  resolvedAt: number | null
}

export interface EngineState {
  night: EngineNight
  /** Every event of the night. */
  events: readonly EngineEvent[]
  memberIds: readonly string[]
  /** Who has answered which event. Only the live events matter. */
  responses: readonly { eventId: string; memberId: string }[]
}

/** The latest event of `kind` that is live, or done with its result still owning the screens. */
export function onStage<E extends EngineEvent>(events: readonly E[], kind: EventKind, now: number): E | undefined {
  return events
    .filter((e) => e.kind === kind && (e.status === 'live' || (e.resolvedAt !== null && now < e.resolvedAt + RESULT_MS)))
    .sort((a, b) => a.seq - b.seq)
    .at(-1)
}

export type EngineAction =
  | { type: 'wait' }
  | { type: 'resolve'; event: EngineEvent }
  /** `endsAt` is server time, like `now`. */
  | { type: 'spawn'; plan: EventPlan; endsAt: number }

/**
 * What a client should do at server time `now`: close an event that is over, open the next one
 * when it is due, or nothing. `force` opens the next event without waiting for its time (the dev
 * trigger); it still waits for a blocking event to finish.
 */
export function nextAction(state: EngineState, now: number, force = false): EngineAction {
  const { night, memberIds } = state
  const events = [...state.events].sort((a, b) => a.seq - b.seq)
  const live = events.filter((e) => e.status === 'live')

  for (const event of live) {
    const everyone =
      ANSWERED_KINDS.includes(event.kind) &&
      memberIds.length > 0 &&
      memberIds.every((id) => state.responses.some((r) => r.eventId === event.id && r.memberId === id))
    if (everyone || now >= event.endsAt + RESOLVE_GRACE_MS) return { type: 'resolve', event }
  }

  if (night.status !== 'live' || night.seed === null || night.startedAt === null) return { type: 'wait' }
  if (memberIds.length === 0) return { type: 'wait' }
  if (live.some((e) => !NON_BLOCKING_KINDS.includes(e.kind))) return { type: 'wait' }

  const last = events.at(-1)
  const plan = planEvent(night.seed, (last?.seq ?? 0) + 1, night.intervalMin)
  if (!force) {
    let due = (last?.startedAt ?? night.startedAt) + plan.gapMs
    if (last && last.resolvedAt !== null && !NON_BLOCKING_KINDS.includes(last.kind)) {
      due = Math.max(due, last.resolvedAt + RESULT_MS)
    }
    if (now < due) return { type: 'wait' }
  }
  return { type: 'spawn', plan, endsAt: now + plan.durationMs }
}
