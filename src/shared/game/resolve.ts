// Event + answers -> Resolution. Pure and deterministic: every client that resolves the same
// event from the same rows hands resolve_event the same result, so it does not matter who wins.
import { AWARD_REASONS } from '../content/events'
import type { EventPayload, EventResponse, PointsAward, Resolution, StrafeAward } from './types'

export const PROSIT_POINTS = 3

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
    default:
      throw new Error(`resolve: ${payload.kind} is not implemented`)
  }
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
