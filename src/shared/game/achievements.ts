// Achievements: small honours earned during the night, read from the log as it grows. The TV
// pops each one up once. Pure and deterministic; nothing is stored, so an undone drink can take
// one back (the TV has already shown it by then, and that is fine).
import type { NightLog } from './awards'
import { CENTILITRES, WASSER_DUE_MASS } from './drinks'

export const ACHIEVEMENT_KEYS = [
  'anstich',
  'liter1',
  'liter2',
  'liter3',
  'liter5',
  'hattrick',
  'schnaps3',
  'wasser',
  'strafe3',
  'strafe5',
  'prosit3',
  'duell2',
  'orator',
  'volltreffer',
  'besinnung',
] as const
export type AchievementKey = (typeof ACHIEVEMENT_KEYS)[number]

export interface Achievement {
  /** `${key}:${memberId}`: each member earns each achievement once. */
  id: string
  key: AchievementKey
  memberId: string
  /** Server time of the row that earned it, ms. */
  at: number
}

/** Three noble drinks within this window make a Hattrick. */
export const HATTRICK_MS = 20 * 60_000
/** A Trinkspruch rated at least this earns the orator's honour. */
export const ORATOR_AVERAGE = 4.5

const LITRE_KEYS = [
  [100, 'liter1'],
  [200, 'liter2'],
  [300, 'liter3'],
  [500, 'liter5'],
] as const

/** Every achievement earned in the log, oldest first (ties by id). */
export function computeAchievements(log: NightLog): Achievement[] {
  const members = new Set(log.memberIds)
  const out = new Map<string, Achievement>()
  const earn = (key: AchievementKey, memberId: string, at: number) => {
    const id = `${key}:${memberId}`
    if (members.has(memberId) && !out.has(id)) out.set(id, { id, key, memberId, at })
  }
  const nth = <T extends { memberId: string }>(rows: readonly T[], n: number, key: AchievementKey, at: (row: T) => number) => {
    const seen = new Map<string, number>()
    for (const row of rows) {
      const count = (seen.get(row.memberId) ?? 0) + 1
      seen.set(row.memberId, count)
      if (count === n) earn(key, row.memberId, at(row))
    }
  }

  const drinks = [...log.drinks].filter((d) => members.has(d.memberId)).sort((a, b) => a.at - b.at)
  const firstMass = drinks.find((d) => d.kind === 'mass')
  if (firstMass) earn('anstich', firstMass.memberId, firstMass.at)
  const firstWasser = drinks.find((d) => d.kind === 'wasser')
  if (firstWasser) earn('wasser', firstWasser.memberId, firstWasser.at)

  // A Wasser after WASSER_DUE_MASS Maß in a row: the physician's advice, heeded.
  const streak = new Map<string, number>()
  for (const d of drinks) {
    if (d.kind === 'mass') streak.set(d.memberId, (streak.get(d.memberId) ?? 0) + 1)
    if (d.kind !== 'wasser') continue
    if ((streak.get(d.memberId) ?? 0) >= WASSER_DUE_MASS) earn('besinnung', d.memberId, d.at)
    streak.set(d.memberId, 0)
  }

  const noble = drinks.filter((d) => d.kind !== 'wasser')
  const cl = new Map<string, number>()
  const recent = new Map<string, number[]>()
  for (const d of noble) {
    const total = (cl.get(d.memberId) ?? 0) + CENTILITRES[d.kind]
    cl.set(d.memberId, total)
    for (const [litres, key] of LITRE_KEYS) if (total >= litres) earn(key, d.memberId, d.at)
    const times = [...(recent.get(d.memberId) ?? []), d.at].slice(-3)
    recent.set(d.memberId, times)
    if (times.length === 3 && times[2] - times[0] <= HATTRICK_MS) earn('hattrick', d.memberId, d.at)
  }
  nth(
    drinks.filter((d) => d.kind === 'schnaps'),
    3,
    'schnaps3',
    (d) => d.at,
  )

  const strafen = [...log.strafen].sort((a, b) => a.at - b.at)
  nth(strafen, 3, 'strafe3', (s) => s.at)
  nth(strafen, 5, 'strafe5', (s) => s.at)

  const resolved = log.events
    .flatMap((e) => (e.result !== null && e.resolvedAt !== null ? [{ ...e, result: e.result, resolvedAt: e.resolvedAt }] : []))
    .sort((a, b) => a.resolvedAt - b.resolvedAt)
  const firsts = resolved.flatMap((e) =>
    e.result.kind === 'prosit' && e.result.order.length > 0 ? [{ memberId: e.result.order[0], at: e.resolvedAt }] : [],
  )
  nth(firsts, 3, 'prosit3', (r) => r.at)
  const wins = resolved.flatMap((e) => (e.result.kind === 'duell' && e.result.winner !== null ? [{ memberId: e.result.winner, at: e.resolvedAt }] : []))
  nth(wins, 2, 'duell2', (r) => r.at)
  for (const e of resolved) {
    if (e.payload.kind === 'trinkspruch' && e.result.kind === 'trinkspruch' && e.result.average !== null && e.result.average >= ORATOR_AVERAGE) {
      earn('orator', e.payload.speaker, e.resolvedAt)
    }
    if (e.payload.kind === 'schatzfrage' && e.result.kind === 'schatzfrage') {
      const { answer } = e.payload
      for (const [memberId, guess] of Object.entries(e.result.guesses).sort(([a], [b]) => (a < b ? -1 : 1))) {
        if (guess === answer) earn('volltreffer', memberId, e.resolvedAt)
      }
    }
  }

  return [...out.values()].sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}
