// Rows as the app sees them, and the mappers from raw PostgREST/Realtime records. Timestamps
// become ms since the epoch (server time), so the pure logic in src/shared/game can use them.
import type {
  DrinkKind,
  EventKind,
  EventPayload,
  EventResponse,
  EventResult,
  EventStatus,
  Member,
  NightStatus,
} from '../shared/game/types'

/** This device's membership, kept in localStorage (src/lib/identity.ts). */
export interface Identity {
  memberId: string
  token: string
}

type Raw = Record<string, unknown>

export interface NightRow {
  status: NightStatus
  /** null until start_night. */
  seed: number | null
  startedAt: number | null
  intervalMin: number
  endedAt: number | null
}

export interface MemberRow extends Member {
  createdAt: number
}

export interface DrinkRow {
  id: string
  memberId: string
  kind: DrinkKind
  at: number
}

export interface EventRow {
  id: string
  seq: number
  kind: EventKind
  payload: EventPayload
  startedAt: number
  endsAt: number
  status: EventStatus
  /** null until resolved. */
  result: EventResult | null
}

export interface ResponseRow {
  id: string
  eventId: string
  memberId: string
  payload: EventResponse
  at: number
}

export interface StrafeRow {
  id: string
  memberId: string
  /** null: handed out by an event. */
  givenBy: string | null
  reason: string
  eventId: string | null
  at: number
}

export interface PointsRow {
  id: string
  memberId: string
  amount: number
  reason: string
  eventId: string | null
  at: number
}

/** What join() returns. */
export interface NewMember {
  id: string
  token: string
}

function ms(value: unknown): number {
  return Date.parse(String(value))
}

function msOrNull(value: unknown): number | null {
  return value == null ? null : ms(value)
}

function strOrNull(value: unknown): string | null {
  return value == null ? null : String(value)
}

export function toNight(r: Raw): NightRow {
  return {
    status: r.status as NightStatus,
    seed: r.seed == null ? null : Number(r.seed),
    startedAt: msOrNull(r.started_at),
    // numeric: a number from PostgREST, possibly a string from Realtime.
    intervalMin: Number(r.interval_min),
    endedAt: msOrNull(r.ended_at),
  }
}

export function toMember(r: Raw): MemberRow {
  return { id: String(r.id), name: String(r.name), colour: String(r.colour), createdAt: ms(r.created_at) }
}

export function toDrink(r: Raw): DrinkRow {
  return { id: String(r.id), memberId: String(r.member_id), kind: r.kind as DrinkKind, at: ms(r.at) }
}

export function toEvent(r: Raw): EventRow {
  return {
    id: String(r.id),
    seq: Number(r.seq),
    kind: r.kind as EventKind,
    payload: r.payload as EventPayload,
    startedAt: ms(r.started_at),
    endsAt: ms(r.ends_at),
    status: r.status as EventStatus,
    result: (r.result ?? null) as EventResult | null,
  }
}

export function toResponse(r: Raw): ResponseRow {
  return {
    id: String(r.id),
    eventId: String(r.event_id),
    memberId: String(r.member_id),
    payload: r.payload as EventResponse,
    at: ms(r.at),
  }
}

export function toStrafe(r: Raw): StrafeRow {
  return {
    id: String(r.id),
    memberId: String(r.member_id),
    givenBy: strOrNull(r.given_by),
    reason: String(r.reason),
    eventId: strOrNull(r.event_id),
    at: ms(r.at),
  }
}

export function toPoints(r: Raw): PointsRow {
  return {
    id: String(r.id),
    memberId: String(r.member_id),
    amount: Number(r.amount),
    reason: String(r.reason),
    eventId: strOrNull(r.event_id),
    at: ms(r.at),
  }
}
