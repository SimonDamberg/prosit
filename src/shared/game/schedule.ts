// The event schedule and the engine's decision, both pure. Every connected client computes the
// same plan for event N from the night's seed, so whichever client writes first writes what the
// others would have written.
import { QUESTIONS } from '../content/questions'
import { RULES } from '../content/rules'
import { TOAST_TOPICS } from '../content/toasts'
import { VOTES } from '../content/votes'
import { createRng } from './rng'
import type { EventKind, EventPayload, EventStatus, NightStatus } from './types'

/** Kinds the schedule may draw. */
export const ENABLED_KINDS: readonly EventKind[] = ['prosit', 'duell', 'regel', 'abstimmung', 'schatzfrage', 'trinkspruch']

/** Kinds that take two members or more. A smaller club never draws them. */
export const COMPANY_KINDS: readonly EventKind[] = ['duell', 'abstimmung', 'trinkspruch']

/** A Regel holds in the background: the next event may start while it is still in force. */
export const NON_BLOCKING_KINDS: readonly EventKind[] = ['regel']

/** Kinds that collect answers. The engine reads those fresh before it decides anything. */
export const ANSWERED_KINDS: readonly EventKind[] = ['prosit', 'duell', 'abstimmung', 'schatzfrage', 'trinkspruch']

export const PROSIT_MS = 60_000
export const REGEL_MS = 10 * 60_000
export const DUELL_MS = 45_000
export const ABSTIMMUNG_MS = 60_000
export const SCHATZFRAGE_MS = 75_000
export const TRINKSPRUCH_MS = 90_000
/** "ZIEH!" comes this far into a Duell, as a share of its length: time to get the phones out. */
export const DRAW_MIN = 0.6
export const DRAW_MAX = 0.85
/** The wait before an event is the interval times a factor in this range: 8 to 15 min at 12. */
export const GAP_MIN = 0.67
export const GAP_MAX = 1.25
/** After a deadline, before resolving: lets the last answers land in every client's fetch. */
export const RESOLVE_GRACE_MS = 1000
/** After a blocking event resolves, the result owns the screens for this long. */
export const RESULT_MS = 12_000

// Each pool is shuffled by the seed plus its own salt, so the pools do not move in step.
const SALT = { votes: 7_919, questions: 15_485_863, toasts: 104_729, speaker: 1_299_709 } as const

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
 * rules, votes, questions and topics come out of seed-shuffled pools, so none repeats until all
 * have been used. Duellists and speakers are picked in fair rounds from `memberIds`.
 * Texts are copied into the payload: an event stays readable even if the pool changes.
 * `forceKind` replaces the drawn kind (the dev trigger); it is ignored if the club is too small.
 */
export function planEvent(
  seed: number,
  seq: number,
  intervalMin: number,
  memberIds: readonly string[],
  forceKind?: EventKind,
): EventPlan {
  const ids = [...new Set(memberIds)].sort()
  const allowed = (k: EventKind) => ids.length >= 2 || !COMPANY_KINDS.includes(k)
  const drawable = ENABLED_KINDS.filter(allowed)
  // How many earlier events of each kind: the turn into that kind's pool.
  const turns: Record<EventKind, number> = { prosit: 0, duell: 0, regel: 0, abstimmung: 0, schatzfrage: 0, trinkspruch: 0 }
  let prev: EventKind | null = null
  let rng = createRng(seed)
  let kind: EventKind = drawable[0]
  for (let n = 1; n <= seq; n++) {
    if (prev) turns[prev]++
    rng = createRng(seed + n)
    const options = drawable.filter((k) => k !== prev)
    kind = rng.pick(options.length > 0 ? options : drawable)
    prev = kind
  }
  if (forceKind && allowed(forceKind)) kind = forceKind

  const intervalMs = intervalMin * 60_000
  const gapMs = Math.round(intervalMs * rng.float(GAP_MIN, GAP_MAX))
  // Capped at one interval, so a night on a very short (test) interval keeps moving.
  const lasts = (ms: number) => Math.round(Math.min(ms, intervalMs))
  const turn = turns[kind]
  const draw = <T>(pool: readonly T[], salt: number): T => createRng(seed + salt).shuffle(pool)[turn % pool.length]

  switch (kind) {
    case 'prosit':
      return { seq, kind, payload: { kind }, gapMs, durationMs: lasts(PROSIT_MS) }
    case 'regel':
      return { seq, kind, payload: { kind, rule: draw(RULES, 0) }, gapMs, durationMs: lasts(REGEL_MS) }
    case 'duell': {
      const [a, b] = pickFair(seed, ids, turn, 2)
      const durationMs = lasts(DUELL_MS)
      const drawAfterMs = Math.round(durationMs * rng.float(DRAW_MIN, DRAW_MAX))
      return { seq, kind, payload: { kind, a, b, drawAfterMs }, gapMs, durationMs }
    }
    case 'abstimmung':
      return { seq, kind, payload: { kind, ...draw(VOTES, SALT.votes) }, gapMs, durationMs: lasts(ABSTIMMUNG_MS) }
    case 'schatzfrage':
      return { seq, kind, payload: { kind, ...draw(QUESTIONS, SALT.questions) }, gapMs, durationMs: lasts(SCHATZFRAGE_MS) }
    case 'trinkspruch': {
      const [speaker] = pickFair(seed + SALT.speaker, ids, turn)
      const topic = draw(TOAST_TOPICS, SALT.toasts)
      return { seq, kind, payload: { kind, speaker, topic }, gapMs, durationMs: lasts(TRINKSPRUCH_MS) }
    }
  }
}

/**
 * Who has to answer before an event may close ahead of its deadline. null: it never closes early.
 * A Duell waits for its two duellists only; the bystanders' picks are optional.
 */
export function responders(payload: EventPayload, memberIds: readonly string[]): string[] | null {
  switch (payload.kind) {
    case 'regel':
      return null
    case 'duell':
      return [payload.a, payload.b]
    case 'trinkspruch':
      return memberIds.filter((id) => id !== payload.speaker)
    default:
      return [...memberIds]
  }
}

/**
 * A Trinkspruch in three acts: the speaker gets up, speaks from `speechFrom` to `speechTo`, and
 * the club rates until the event ends. Shares of the event, so 15 s and 45 s into the usual 90.
 */
export function trinkspruchPhases(startedAt: number, endsAt: number): { speechFrom: number; speechTo: number } {
  const length = endsAt - startedAt
  return { speechFrom: startedAt + Math.round(length / 6), speechTo: startedAt + Math.round(length / 2) }
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
  payload: EventPayload
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

/** The blocking event that owns the screens: live, or done with its result still showing. */
export function stageEvent<E extends EngineEvent>(events: readonly E[], now: number): E | undefined {
  return events
    .filter((e) => !NON_BLOCKING_KINDS.includes(e.kind))
    .filter((e) => e.status === 'live' || (e.resolvedAt !== null && now < e.resolvedAt + RESULT_MS))
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
 * trigger), as a given kind if it names one; it still waits for a blocking event to finish.
 */
export function nextAction(state: EngineState, now: number, force: boolean | EventKind = false): EngineAction {
  const { night, memberIds } = state
  const events = [...state.events].sort((a, b) => a.seq - b.seq)
  const live = events.filter((e) => e.status === 'live')

  for (const event of live) {
    const due = responders(event.payload, memberIds)
    const everyone =
      due !== null &&
      due.length > 0 &&
      due.every((id) => state.responses.some((r) => r.eventId === event.id && r.memberId === id))
    if (everyone || now >= event.endsAt + RESOLVE_GRACE_MS) return { type: 'resolve', event }
  }

  if (night.status !== 'live' || night.seed === null || night.startedAt === null) return { type: 'wait' }
  if (memberIds.length === 0) return { type: 'wait' }
  if (live.some((e) => !NON_BLOCKING_KINDS.includes(e.kind))) return { type: 'wait' }

  const last = events.at(-1)
  const forceKind = typeof force === 'string' ? force : undefined
  const plan = planEvent(night.seed, (last?.seq ?? 0) + 1, night.intervalMin, memberIds, forceKind)
  if (!force) {
    let due = (last?.startedAt ?? night.startedAt) + plan.gapMs
    if (last && last.resolvedAt !== null && !NON_BLOCKING_KINDS.includes(last.kind)) {
      due = Math.max(due, last.resolvedAt + RESULT_MS)
    }
    if (now < due) return { type: 'wait' }
  }
  return { type: 'spawn', plan, endsAt: now + plan.durationMs }
}
