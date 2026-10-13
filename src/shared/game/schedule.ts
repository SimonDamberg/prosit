// The event schedule and the engine's decision, both pure. Every connected client computes the
// same plan for event N from the night's seed, so whichever client writes first writes what the
// others would have written.
import { QUESTIONS } from '../content/questions'
import { RULES } from '../content/rules'
import { TOAST_TOPICS } from '../content/toasts'
import { VOTES } from '../content/votes'
import { createRng } from './rng'
import type { EventKind, EventPayload, EventStatus, NightStatus } from './types'

/**
 * Kinds the programme draws from. PROSIT! is not one of them: it keeps its own clock (see
 * `prositGapMs`) and cuts in between the others, about every ten minutes.
 */
export const ENABLED_KINDS: readonly EventKind[] = ['duell', 'regel', 'abstimmung', 'schatzfrage', 'trinkspruch']

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
/** A PROSIT! comes about this often, whatever the programme is doing. */
export const PROSIT_EVERY_MS = 10 * 60_000
/** The wait before a PROSIT! is that time a factor in this range (6 to 14 min), so nobody can set a watch by it. */
export const PROSIT_GAP_MIN = 0.6
export const PROSIT_GAP_MAX = 1.4
/** After a deadline, before resolving: lets the last answers land in every client's fetch. */
export const RESOLVE_GRACE_MS = 1000
/** After a blocking event resolves, the result owns the screens for this long. */
export const RESULT_MS = 12_000

// Each pool is shuffled by the seed plus its own salt, so the pools do not move in step.
const SALT = { votes: 7_919, questions: 15_485_863, toasts: 104_729, speaker: 1_299_709, prosit: 611_953 } as const

export interface EventPlan {
  /** From `planEvent`: the number in the programme. From `nextAction`: the seq to spawn it as. */
  seq: number
  kind: EventKind
  payload: EventPayload
  /** Wait from the previous event's start (or the night's start) until this one is due. */
  gapMs: number
  /** How long the event stays open. */
  durationMs: number
}

/**
 * Event `seq` (from 1) of the night's programme with this seed, which is every event but the
 * PROSIT!s that cut in between. The kind never repeats the previous one, and
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
 * The wait before PROSIT! number `count` (from 0) of the night, from the previous one's start or
 * the night's. Never more than two intervals, so a night on a short (test) interval toasts too.
 */
export function prositGapMs(seed: number, count: number, intervalMin: number): number {
  const every = Math.min(PROSIT_EVERY_MS, 2 * intervalMin * 60_000)
  return Math.round(every * createRng(seed + SALT.prosit + count).float(PROSIT_GAP_MIN, PROSIT_GAP_MAX))
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
 * when it is due, or nothing. Two clocks run side by side: the programme (`planEvent`, waiting
 * from the previous programme event) and PROSIT! (`prositGapMs`, waiting from the previous
 * PROSIT!). When both are due the PROSIT! goes first. Neither starts while a blocking event is
 * live or its result is still on the screens.
 * `force` opens the next programme event without waiting for its time (the dev trigger), or an
 * event of the kind it names; it still waits for a live blocking event to finish.
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

  const seq = (events.at(-1)?.seq ?? 0) + 1
  const prosits = events.filter((e) => e.kind === 'prosit')
  const programme = events.filter((e) => e.kind !== 'prosit')
  const intervalMs = night.intervalMin * 60_000
  const prosit: EventPlan = {
    seq,
    kind: 'prosit',
    payload: { kind: 'prosit' },
    gapMs: prositGapMs(night.seed, prosits.length, night.intervalMin),
    durationMs: Math.round(Math.min(PROSIT_MS, intervalMs)),
  }
  const forceKind = typeof force === 'string' && force !== 'prosit' ? force : undefined
  const next: EventPlan = { ...planEvent(night.seed, programme.length + 1, night.intervalMin, memberIds, forceKind), seq }
  const spawn = (plan: EventPlan): EngineAction => ({ type: 'spawn', plan, endsAt: now + plan.durationMs })

  if (force) return spawn(force === 'prosit' ? prosit : next)

  // The result of the last blocking event keeps the screens for a while.
  const shown = events.filter((e) => !NON_BLOCKING_KINDS.includes(e.kind)).at(-1)
  if (shown && shown.resolvedAt !== null && now < shown.resolvedAt + RESULT_MS) return { type: 'wait' }

  if (now >= (prosits.at(-1)?.startedAt ?? night.startedAt) + prosit.gapMs) return spawn(prosit)
  if (now >= (programme.at(-1)?.startedAt ?? night.startedAt) + next.gapMs) return spawn(next)
  return { type: 'wait' }
}
