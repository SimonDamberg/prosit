// The drink log as numbers: volumes, per-member tallies, the ranking and the TV pace timeline.
// Volumes are counted in whole centilitres so sums stay exact on every device.
import { DRINK_KINDS, type DrinkKind } from './types'

export const CENTILITRES: Record<DrinkKind, number> = {
  ol: 50,
  mass: 100,
  schnaps: 4,
  wasser: 33,
}

/** The kinds that count towards a member's litres. Wasser is tallied on its own. */
export const NOBLE_KINDS = ['ol', 'mass', 'schnaps'] as const satisfies readonly DrinkKind[]

/** A logged drink as the game logic sees one. `at` is ms since the epoch, server time. */
export interface DrinkEntry {
  memberId: string
  kind: DrinkKind
  at: number
}

export interface Tally {
  memberId: string
  counts: Record<DrinkKind, number>
  /** Number of noble drinks (everything but Wasser). */
  drinks: number
  /** Centilitres of noble drinks. */
  cl: number
}

function nobleCl(kind: DrinkKind): number {
  return kind === 'wasser' ? 0 : CENTILITRES[kind]
}

function emptyTally(memberId: string): Tally {
  return { memberId, counts: { ol: 0, mass: 0, schnaps: 0, wasser: 0 }, drinks: 0, cl: 0 }
}

/** One tally per member id, in the order given. Drinks from unknown members are ignored. */
export function tallyDrinks(drinks: readonly DrinkEntry[], memberIds: readonly string[]): Tally[] {
  const byId = new Map(memberIds.map((id) => [id, emptyTally(id)]))
  for (const d of drinks) {
    const t = byId.get(d.memberId)
    if (!t) continue
    t.counts[d.kind] += 1
    if (d.kind !== 'wasser') t.drinks += 1
    t.cl += nobleCl(d.kind)
  }
  return [...byId.values()]
}

/** Sum of several tallies, e.g. the whole club. */
export function sumTallies(tallies: readonly Tally[]): Tally {
  const total = emptyTally('')
  for (const t of tallies) {
    for (const kind of DRINK_KINDS) total.counts[kind] += t.counts[kind]
    total.drinks += t.drinks
    total.cl += t.cl
  }
  return total
}

/** Most centilitres first, then most drinks. Ties keep their incoming order. */
export function rankTallies(tallies: readonly Tally[]): Tally[] {
  return tallies
    .map((t, i) => ({ t, i }))
    .sort((a, b) => b.t.cl - a.t.cl || b.t.drinks - a.t.drinks || a.i - b.i)
    .map((x) => x.t)
}

/** 1-based place of a member in rankTallies, sharing a place on equal cl. 0 if absent. */
export function placeOf(tallies: readonly Tally[], memberId: string): number {
  const mine = tallies.find((t) => t.memberId === memberId)
  if (!mine) return 0
  return 1 + tallies.filter((t) => t.cl > mine.cl).length
}

export interface PaceSeries {
  /** Sample times, ms since the epoch, evenly spaced from start to end inclusive. */
  times: number[]
  /** Cumulative noble centilitres per member at each sample time. */
  cl: Record<string, number[]>
}

/**
 * The night as `steps + 1` samples of each member's running total, for the TV timeline.
 * Drinks before `startMs` count from the first sample; drinks after `endMs` are left out.
 */
export function paceSeries(
  drinks: readonly DrinkEntry[],
  memberIds: readonly string[],
  startMs: number,
  endMs: number,
  steps: number,
): PaceSeries {
  const n = Math.max(1, Math.floor(steps))
  const span = Math.max(0, endMs - startMs)
  const times = Array.from({ length: n + 1 }, (_, i) => startMs + (span * i) / n)
  const cl: Record<string, number[]> = {}
  for (const id of memberIds) {
    const mine = drinks.filter((d) => d.memberId === id && d.kind !== 'wasser').sort((a, b) => a.at - b.at)
    let sum = 0
    let next = 0
    cl[id] = times.map((t) => {
      while (next < mine.length && mine[next].at <= t) sum += nobleCl(mine[next++].kind)
      return sum
    })
  }
  return { times, cl }
}

/** Number of Strafen per member id. */
export function strafeTally(strafen: readonly { memberId: string }[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const s of strafen) out[s.memberId] = (out[s.memberId] ?? 0) + 1
  return out
}

/** After this many Maß without a Wasser, the club's physician speaks up. */
export const WASSER_DUE_MASS = 3

/** Maß logged by each member since their last Wasser, in the order of `at`. */
function massStreaks(drinks: readonly DrinkEntry[]): Map<string, number> {
  const streak = new Map<string, number>()
  for (const d of [...drinks].sort((a, b) => a.at - b.at)) {
    if (d.kind === 'wasser') streak.set(d.memberId, 0)
    else if (d.kind === 'mass') streak.set(d.memberId, (streak.get(d.memberId) ?? 0) + 1)
  }
  return streak
}

/** True when the member has had `WASSER_DUE_MASS` Maß or more since their last Wasser. */
export function wasserDue(drinks: readonly DrinkEntry[], memberId: string): boolean {
  return (massStreaks(drinks.filter((d) => d.memberId === memberId)).get(memberId) ?? 0) >= WASSER_DUE_MASS
}
