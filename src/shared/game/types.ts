// Shapes shared by the game logic, the Supabase layer and both apps. The jsonb columns
// (events.payload, events.result, responses.payload) hold exactly these types, so every value must
// survive a JSON round trip: no Dates, no undefined, no Maps.

export const DRINK_KINDS = ['ol', 'mass', 'schnaps', 'wasser'] as const
export type DrinkKind = (typeof DRINK_KINDS)[number]

export type NightStatus = 'idle' | 'live' | 'ended'

export const EVENT_KINDS = ['prosit', 'duell', 'regel', 'abstimmung', 'schatzfrage', 'trinkspruch'] as const
export type EventKind = (typeof EVENT_KINDS)[number]

export type EventStatus = 'live' | 'done'

/** A member as the game logic sees one. */
export interface Member {
  id: string
  name: string
  colour: string
}

// Payloads: what the schedule decides when an event spawns. Texts are copied in from the content
// pools, so an event stays readable even if the pool is edited mid-night.

export type EventPayload =
  /** Everyone toasts and taps. */
  | { kind: 'prosit' }
  /** Two members play the reaction game. `drawAfterMs` is when "ZIEH!" shows, from started_at. */
  | { kind: 'duell'; a: string; b: string; drawAfterMs: number }
  | { kind: 'regel'; rule: string }
  | { kind: 'abstimmung'; question: string }
  | { kind: 'schatzfrage'; question: string; answer: number; unit: string }
  | { kind: 'trinkspruch'; speaker: string; topic: string }

// Responses: one per member and event.

export type EventResponse =
  | { kind: 'prosit' }
  /** A duellist's tap, in ms from started_at. Before `drawAfterMs` is a false start. */
  | { kind: 'duell'; tapMs: number }
  /** A bystander's pick of the winner. */
  | { kind: 'duell_pick'; pick: string }
  | { kind: 'abstimmung'; vote: string }
  | { kind: 'schatzfrage'; guess: number }
  /** 1 to 5 Maß. */
  | { kind: 'trinkspruch'; rating: number }

// Results: what resolve() writes back onto the event.

export type EventResult =
  /** `order` is member ids, fastest first. `missed` never tapped. */
  | { kind: 'prosit'; order: string[]; missed: string[] }
  /** `winner` is null when both false-started or neither tapped. */
  | { kind: 'duell'; winner: string | null; loser: string | null }
  | { kind: 'regel' }
  /** `winners` holds more than one id on a tie. */
  | { kind: 'abstimmung'; winners: string[]; votes: Record<string, number> }
  | { kind: 'schatzfrage'; closest: string | null; furthest: string | null }
  | { kind: 'trinkspruch'; average: number | null }

export interface PointsAward {
  memberId: string
  amount: number
  reason: string
}

export interface StrafeAward {
  memberId: string
  reason: string
}

/** Everything resolve() hands to the resolve_event RPC. */
export interface Resolution {
  result: EventResult
  points: PointsAward[]
  strafen: StrafeAward[]
}
