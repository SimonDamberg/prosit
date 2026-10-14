// The finale: the night's log -> the awards, in the order the ceremony reads them out, and the
// ceremony's timeline. Pure and deterministic, so the TV and every phone agree on who won what.
import { strafeTally, tallyDrinks, type DrinkEntry } from './drinks'
import { fmtInt, fmtLitres, fmtNumber } from './format'
import type { EventPayload, EventResult } from './types'

/** Everything the finale and the achievements read. Rows from src/lib/types fit as they are. */
export interface NightLog {
  /** In display order: ties list their members in this order. */
  memberIds: readonly string[]
  drinks: readonly DrinkEntry[]
  strafen: readonly { memberId: string; givenBy: string | null; at: number }[]
  points: readonly { memberId: string; amount: number; at: number }[]
  events: readonly { payload: EventPayload; result: EventResult | null; resolvedAt: number | null }[]
  /**
   * The awards read nothing after this (night.ended_at). An event still live at the end is
   * resolved afterwards, and its Strafen must not change the ceremony while it runs.
   */
  endedAt?: number | null
}

/** Ceremony order: the small fry first, the grand prize last. */
export const AWARD_KEYS = [
  'wasser',
  'schnaps',
  'massvoll',
  'ordnung',
  'strafe',
  'hand',
  'prosit',
  'orakel',
  'orator',
  'bier',
  'praesident',
] as const
export type AwardKey = (typeof AWARD_KEYS)[number]

export interface Award {
  key: AwardKey
  /** More than one on a tie, in `memberIds` order. */
  memberIds: string[]
  /** What it was won with: a count, centilitres, ms (hand) or an average (orator). */
  value: number
}

/** Members holding the best value, or none when nobody has one. `best` picks max or min. */
function leaders(values: ReadonlyMap<string, number>, memberIds: readonly string[], best: 'max' | 'min') {
  const scored = memberIds.filter((id) => values.has(id))
  if (scored.length === 0) return null
  const pick = best === 'max' ? Math.max : Math.min
  const value = pick(...scored.map((id) => values.get(id)!))
  return { memberIds: scored.filter((id) => values.get(id) === value), value }
}

function counts(ids: Iterable<string>): Map<string, number> {
  const out = new Map<string, number>()
  for (const id of ids) out.set(id, (out.get(id) ?? 0) + 1)
  return out
}

/** Keeps only positive values: an award for zero of something is no award. */
function positive(values: Map<string, number>): Map<string, number> {
  return new Map([...values].filter(([, v]) => v > 0))
}

export function computeAwards(full: NightLog): Award[] {
  const until = full.endedAt ?? Infinity
  const log = {
    ...full,
    drinks: full.drinks.filter((d) => d.at <= until),
    strafen: full.strafen.filter((s) => s.at <= until),
    points: full.points.filter((p) => p.at <= until),
    events: full.events.filter((e) => e.resolvedAt !== null && e.resolvedAt <= until),
  }
  const { memberIds } = log
  const members = new Set(memberIds)
  const tallies = tallyDrinks(log.drinks, memberIds)
  const results = log.events.flatMap((e) => (e.result ? [e.result] : []))

  const byKey: Record<AwardKey, Map<string, number>> = {
    wasser: positive(new Map(tallies.map((t) => [t.memberId, t.counts.wasser]))),
    schnaps: positive(new Map(tallies.map((t) => [t.memberId, t.counts.schnaps]))),
    massvoll: new Map(tallies.filter((t) => t.cl > 0).map((t) => [t.memberId, t.cl])),
    ordnung: counts(log.strafen.flatMap((s) => (s.givenBy !== null && members.has(s.givenBy) ? [s.givenBy] : []))),
    strafe: new Map(Object.entries(strafeTally(log.strafen))),
    hand: new Map(),
    prosit: counts(results.flatMap((r) => (r.kind === 'prosit' && r.order.length > 0 ? [r.order[0]] : []))),
    orakel: counts(results.flatMap((r) => (r.kind === 'schatzfrage' && r.closest !== null ? [r.closest] : []))),
    orator: new Map(),
    bier: positive(new Map(tallies.map((t) => [t.memberId, t.cl]))),
    praesident: new Map(),
  }
  for (const r of results) {
    if (r.kind !== 'duell' || r.winner === null) continue
    const ms = r.reactions[r.winner]
    if (ms !== undefined && ms < (byKey.hand.get(r.winner) ?? Infinity)) byKey.hand.set(r.winner, ms)
  }
  for (const e of log.events) {
    if (e.payload.kind !== 'trinkspruch' || e.result?.kind !== 'trinkspruch' || e.result.average === null) continue
    const { speaker } = e.payload
    byKey.orator.set(speaker, Math.max(byKey.orator.get(speaker) ?? 0, e.result.average))
  }
  for (const p of log.points) byKey.praesident.set(p.memberId, (byKey.praesident.get(p.memberId) ?? 0) + p.amount)
  byKey.praesident = positive(byKey.praesident)

  const awards: Award[] = []
  for (const key of AWARD_KEYS) {
    const lowest = key === 'massvoll' || key === 'hand'
    const won = leaders(byKey[key], memberIds, lowest ? 'min' : 'max')
    if (!won) continue
    // Moderation needs somebody to be moderate against: not when every drinker drank the same.
    if (key === 'massvoll' && won.memberIds.length === byKey.massvoll.size) continue
    awards.push({ key, ...won })
  }
  return awards
}

/** The value as the screens print it: litres for the drink awards, the rest as numbers. */
export function awardValue(award: Award): string {
  switch (award.key) {
    case 'bier':
    case 'massvoll':
      return fmtLitres(award.value, 2)
    case 'orator':
      return fmtNumber(award.value)
    default:
      return fmtInt(award.value)
  }
}

/** The awards a member holds, alone or shared. */
export function awardsOf(awards: readonly Award[], memberId: string): Award[] {
  return awards.filter((a) => a.memberIds.includes(memberId))
}

// The ceremony on the TV, timed from night.ended_at so a reloaded TV picks up where it was.

export const FINALE_INTRO_MS = 10_000
export const FINALE_AWARD_MS = 15_000
/** The drum roll before the name. */
export const FINALE_REVEAL_MS = 3_500

export type FinaleStep =
  | { phase: 'intro'; startsAt: number }
  | { phase: 'award'; index: number; startsAt: number; revealAt: number }
  | { phase: 'standings'; startsAt: number }

export function finaleStep(endedAt: number, awardCount: number, now: number): FinaleStep {
  const t = now - endedAt
  if (t < FINALE_INTRO_MS) return { phase: 'intro', startsAt: endedAt }
  const index = Math.floor((t - FINALE_INTRO_MS) / FINALE_AWARD_MS)
  const startsAt = endedAt + FINALE_INTRO_MS + Math.min(index, awardCount) * FINALE_AWARD_MS
  if (index >= awardCount) return { phase: 'standings', startsAt }
  return { phase: 'award', index, startsAt, revealAt: startsAt + FINALE_REVEAL_MS }
}

/** Total length of the ceremony, until the standings. */
export function finaleLength(awardCount: number): number {
  return FINALE_INTRO_MS + awardCount * FINALE_AWARD_MS
}
