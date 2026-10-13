// Event + answers -> Resolution. Pure and deterministic: every client that resolves the same
// event from the same rows hands resolve_event the same result, so it does not matter who wins.
import { AWARD_REASONS } from '../content/events'
import type { EventPayload, EventResponse, PointsAward, Resolution, StrafeAward } from './types'

export const PROSIT_POINTS = 3
export const DUELL_POINTS = 3
export const DUELL_PICK_POINTS = 1
export const SCHATZ_POINTS = 3
/** A Trinkspruch rated under this on average earns a Strafe instead of points. */
export const TRINKSPRUCH_FLOOR = 2

export interface Answer {
  memberId: string
  payload: EventResponse
  /** Server time of the answer, ms. */
  at: number
}

export function resolve(payload: EventPayload, answers: readonly Answer[], memberIds: readonly string[]): Resolution {
  switch (payload.kind) {
    case 'prosit':
      return resolveProsit(answers, memberIds)
    case 'regel':
      return { result: { kind: 'regel' }, points: [], strafen: [] }
    case 'duell':
      return resolveDuell(payload, answers, memberIds)
    case 'abstimmung':
      return resolveAbstimmung(answers, memberIds)
    case 'schatzfrage':
      return resolveSchatzfrage(payload, answers, memberIds)
    case 'trinkspruch':
      return resolveTrinkspruch(payload, answers, memberIds)
  }
}

/**
 * Each member's first answer, oldest first. Ties on the timestamp break by id, so the order is the
 * same on every device. Strangers (not in `memberIds`) are dropped.
 */
function firstAnswers(answers: readonly Answer[], memberIds: readonly string[]): Answer[] {
  const members = new Set(memberIds)
  const sorted = answers
    .filter((a) => members.has(a.memberId))
    .sort((a, b) => a.at - b.at || (a.memberId < b.memberId ? -1 : a.memberId > b.memberId ? 1 : 0))
  const seen = new Set<string>()
  return sorted.filter((a) => !seen.has(a.memberId) && seen.add(a.memberId))
}

/** Fastest earns points. The last to tap and everyone who never did get a Strafe. */
function resolveProsit(answers: readonly Answer[], memberIds: readonly string[]): Resolution {
  const members = [...new Set(memberIds)].sort()
  const taps = new Map<string, number>()
  for (const a of answers) {
    if (a.payload.kind === 'prosit' && members.includes(a.memberId) && !taps.has(a.memberId)) taps.set(a.memberId, a.at)
  }
  // Ties on the timestamp break by id, so the order is the same on every device.
  const order = [...taps.keys()].sort((a, b) => taps.get(a)! - taps.get(b)! || (a < b ? -1 : 1))
  const missed = members.filter((id) => !taps.has(id))

  const points: PointsAward[] = []
  const strafen: StrafeAward[] = []
  if (order.length > 0) points.push({ memberId: order[0], amount: PROSIT_POINTS, reason: AWARD_REASONS.prositFirst })
  if (order.length > 1) strafen.push({ memberId: order.at(-1)!, reason: AWARD_REASONS.prositLast })
  for (const id of missed) strafen.push({ memberId: id, reason: AWARD_REASONS.prositMissed })

  return { result: { kind: 'prosit', order, missed }, points, strafen }
}

type Payload<K extends EventPayload['kind']> = Extract<EventPayload, { kind: K }>

/**
 * The fastest tap after the draw wins; a tap before it is a false start and loses. The loser gets
 * a Strafe, and so do both when nobody wins. Bystanders who picked the winner earn a point.
 */
function resolveDuell(payload: Payload<'duell'>, answers: readonly Answer[], memberIds: readonly string[]): Resolution {
  const duellists = [payload.a, payload.b]
  const first = firstAnswers(answers, [...memberIds, ...duellists])
  const reactions: Record<string, number> = {}
  const falseStarts: string[] = []
  // In answer order, so equal reactions go to whoever the database heard first.
  const valid: string[] = []
  for (const a of first) {
    if (a.payload.kind !== 'duell' || !duellists.includes(a.memberId) || !Number.isFinite(a.payload.tapMs)) continue
    if (a.payload.tapMs < payload.drawAfterMs) {
      falseStarts.push(a.memberId)
    } else {
      reactions[a.memberId] = Math.round(a.payload.tapMs - payload.drawAfterMs)
      valid.push(a.memberId)
    }
  }
  falseStarts.sort()

  const winner = valid.length > 0 ? valid.reduce((best, id) => (reactions[id] < reactions[best] ? id : best)) : null
  const loser = winner === null ? null : duellists.find((id) => id !== winner)!

  const points: PointsAward[] = []
  const strafen: StrafeAward[] = []
  if (winner !== null && loser !== null) {
    points.push({ memberId: winner, amount: DUELL_POINTS, reason: AWARD_REASONS.duellWon })
    for (const a of first) {
      if (a.payload.kind === 'duell_pick' && !duellists.includes(a.memberId) && a.payload.pick === winner) {
        points.push({ memberId: a.memberId, amount: DUELL_PICK_POINTS, reason: AWARD_REASONS.duellPick })
      }
    }
    strafen.push({ memberId: loser, reason: falseStarts.includes(loser) ? AWARD_REASONS.duellFalseStart : AWARD_REASONS.duellLost })
  } else {
    for (const id of [...duellists].sort()) {
      strafen.push({ memberId: id, reason: falseStarts.includes(id) ? AWARD_REASONS.duellFalseStart : AWARD_REASONS.duellNoShow })
    }
  }
  return { result: { kind: 'duell', winner, loser, reactions, falseStarts }, points, strafen }
}

/** Most votes takes the title; a tie shares it. Votes for non-members do not count. */
function resolveAbstimmung(answers: readonly Answer[], memberIds: readonly string[]): Resolution {
  const votes: Record<string, number> = {}
  for (const a of firstAnswers(answers, memberIds)) {
    if (a.payload.kind === 'abstimmung' && memberIds.includes(a.payload.vote)) {
      votes[a.payload.vote] = (votes[a.payload.vote] ?? 0) + 1
    }
  }
  const top = Math.max(0, ...Object.values(votes))
  const winners = Object.keys(votes)
    .filter((id) => votes[id] === top)
    .sort()
  return { result: { kind: 'abstimmung', winners, votes }, points: [], strafen: [] }
}

/**
 * Closest earns points; the furthest gets a Strafe, if anyone was further off than the closest.
 * Equal distances: the earlier answer is the closer one, the later the further.
 */
function resolveSchatzfrage(payload: Payload<'schatzfrage'>, answers: readonly Answer[], memberIds: readonly string[]): Resolution {
  const guesses: Record<string, number> = {}
  const order: string[] = []
  for (const a of firstAnswers(answers, memberIds)) {
    if (a.payload.kind !== 'schatzfrage' || !Number.isFinite(a.payload.guess)) continue
    guesses[a.memberId] = a.payload.guess
    order.push(a.memberId)
  }
  const off = (id: string) => Math.abs(guesses[id] - payload.answer)
  let closest: string | null = null
  let furthest: string | null = null
  for (const id of order) {
    if (closest === null || off(id) < off(closest)) closest = id
    if (furthest === null || off(id) >= off(furthest)) furthest = id
  }
  if (closest !== null && furthest !== null && off(furthest) <= off(closest)) furthest = null

  const points: PointsAward[] = []
  const strafen: StrafeAward[] = []
  if (closest !== null) points.push({ memberId: closest, amount: SCHATZ_POINTS, reason: AWARD_REASONS.schatzClosest })
  if (furthest !== null) strafen.push({ memberId: furthest, reason: AWARD_REASONS.schatzFurthest })
  return { result: { kind: 'schatzfrage', closest, furthest, guesses }, points, strafen }
}

/** The speaker earns the rounded average of the ratings, or a Strafe when it is dismal. */
function resolveTrinkspruch(payload: Payload<'trinkspruch'>, answers: readonly Answer[], memberIds: readonly string[]): Resolution {
  const ratings: Record<string, number> = {}
  for (const a of firstAnswers(answers, memberIds)) {
    if (a.payload.kind !== 'trinkspruch' || a.memberId === payload.speaker) continue
    const { rating } = a.payload
    if (Number.isInteger(rating) && rating >= 1 && rating <= 5) ratings[a.memberId] = rating
  }
  const given = Object.values(ratings)
  // Rounded to a tenth, so the stored value is what the screens show.
  const average = given.length > 0 ? Math.round((given.reduce((sum, r) => sum + r, 0) / given.length) * 10) / 10 : null

  const points: PointsAward[] = []
  const strafen: StrafeAward[] = []
  if (average !== null && average < TRINKSPRUCH_FLOOR) {
    strafen.push({ memberId: payload.speaker, reason: AWARD_REASONS.trinkspruchBad })
  } else if (average !== null) {
    points.push({ memberId: payload.speaker, amount: Math.round(average), reason: AWARD_REASONS.trinkspruch })
  }
  return { result: { kind: 'trinkspruch', average, ratings }, points, strafen }
}
