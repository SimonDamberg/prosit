import { describe, expect, it } from 'vitest'
import {
  awardsOf,
  awardValue,
  computeAwards,
  FINALE_AWARD_MS,
  FINALE_INTRO_MS,
  FINALE_REVEAL_MS,
  finaleLength,
  finaleStep,
  type NightLog,
} from './awards'
import type { DrinkKind, EventPayload, EventResult } from './types'

const members = ['a', 'b', 'c', 'd']
const drink = (memberId: string, kind: DrinkKind, at = 0) => ({ memberId, kind, at })
const done = (payload: EventPayload, result: EventResult, resolvedAt = 0) => ({ payload, result, resolvedAt })
const log = (parts: Partial<NightLog>): NightLog => ({ memberIds: members, drinks: [], strafen: [], points: [], events: [], ...parts })

describe('computeAwards', () => {
  it('hands out nothing on an empty night', () => {
    expect(computeAwards(log({}))).toEqual([])
  })

  it('reads the drink log', () => {
    const awards = computeAwards(
      log({
        drinks: [
          drink('a', 'mass'),
          drink('a', 'ol'),
          drink('b', 'ol'),
          drink('b', 'schnaps'),
          drink('b', 'schnaps'),
          drink('c', 'wasser'),
          drink('c', 'ol'),
        ],
      }),
    )
    expect(awards).toEqual([
      { key: 'wasser', memberIds: ['c'], value: 1 },
      { key: 'schnaps', memberIds: ['b'], value: 2 },
      { key: 'massvoll', memberIds: ['c'], value: 50 },
      { key: 'bier', memberIds: ['a'], value: 150 },
    ])
  })

  it('shares an award on a tie, in member order', () => {
    const awards = computeAwards(log({ drinks: [drink('c', 'mass'), drink('a', 'mass'), drink('b', 'ol')] }))
    expect(awards.find((a) => a.key === 'bier')).toEqual({ key: 'bier', memberIds: ['a', 'c'], value: 100 })
  })

  it('gives no moderation award when every drinker drank the same', () => {
    const awards = computeAwards(log({ drinks: [drink('a', 'ol'), drink('b', 'ol')] }))
    expect(awards.map((a) => a.key)).toEqual(['bier'])
  })

  it('counts Strafen taken and given, and ignores strangers', () => {
    const awards = computeAwards(
      log({
        strafen: [
          { memberId: 'a', givenBy: 'b', at: 1 },
          { memberId: 'a', givenBy: null, at: 2 },
          { memberId: 'c', givenBy: 'b', at: 3 },
          { memberId: 'x', givenBy: 'y', at: 4 },
        ],
      }),
    )
    expect(awards).toEqual([
      { key: 'ordnung', memberIds: ['b'], value: 2 },
      { key: 'strafe', memberIds: ['a'], value: 2 },
    ])
  })

  it('reads the events and the points', () => {
    const duell: EventPayload = { kind: 'duell', a: 'a', b: 'b', drawAfterMs: 1000 }
    const awards = computeAwards(
      log({
        points: [
          { memberId: 'd', amount: 3, at: 0 },
          { memberId: 'd', amount: 4, at: 0 },
          { memberId: 'a', amount: 6, at: 0 },
        ],
        events: [
          done({ kind: 'prosit' }, { kind: 'prosit', order: ['c', 'a'], missed: [] }),
          done({ kind: 'prosit' }, { kind: 'prosit', order: ['c'], missed: [] }),
          done({ kind: 'prosit' }, { kind: 'prosit', order: [], missed: members }),
          done(duell, { kind: 'duell', winner: 'a', loser: 'b', reactions: { a: 300, b: 400 }, falseStarts: [] }),
          done(duell, { kind: 'duell', winner: 'b', loser: 'a', reactions: { b: 250 }, falseStarts: ['a'] }),
          done(duell, { kind: 'duell', winner: null, loser: null, reactions: {}, falseStarts: ['a', 'b'] }),
          done(
            { kind: 'schatzfrage', question: 'q', answer: 1, unit: '' },
            { kind: 'schatzfrage', closest: 'd', furthest: null, guesses: { d: 1 } },
          ),
          done({ kind: 'trinkspruch', speaker: 'b', topic: 't' }, { kind: 'trinkspruch', average: 3.5, ratings: {} }),
          done({ kind: 'trinkspruch', speaker: 'c', topic: 't' }, { kind: 'trinkspruch', average: 4.2, ratings: {} }),
          done({ kind: 'trinkspruch', speaker: 'a', topic: 't' }, { kind: 'trinkspruch', average: null, ratings: {} }),
          { payload: { kind: 'prosit' }, result: null, resolvedAt: null },
        ],
      }),
    )
    expect(awards).toEqual([
      { key: 'hand', memberIds: ['b'], value: 250 },
      { key: 'prosit', memberIds: ['c'], value: 2 },
      { key: 'orakel', memberIds: ['d'], value: 1 },
      { key: 'orator', memberIds: ['c'], value: 4.2 },
      { key: 'praesident', memberIds: ['d'], value: 7 },
    ])
  })

  it('reads nothing after the end of the night', () => {
    const awards = computeAwards(
      log({
        endedAt: 100,
        drinks: [drink('a', 'ol', 100), drink('b', 'mass', 101)],
        strafen: [{ memberId: 'c', givenBy: null, at: 150 }],
        points: [{ memberId: 'd', amount: 3, at: 101 }],
        events: [done({ kind: 'prosit' }, { kind: 'prosit', order: ['c'], missed: [] }, 120)],
      }),
    )
    expect(awards).toEqual([{ key: 'bier', memberIds: ['a'], value: 50 }])
  })

  it('reads the grand prize last', () => {
    const awards = computeAwards(log({ drinks: [drink('a', 'wasser'), drink('a', 'ol')], points: [{ memberId: 'b', amount: 1, at: 0 }] }))
    expect(awards.at(-1)?.key).toBe('praesident')
  })

  it('gives the same answer whatever order the rows arrive in', () => {
    const drinks = [drink('a', 'ol', 3), drink('b', 'mass', 1), drink('c', 'schnaps', 2), drink('b', 'wasser', 4)]
    expect(computeAwards(log({ drinks }))).toEqual(computeAwards(log({ drinks: [...drinks].reverse() })))
  })
})

describe('awardValue and awardsOf', () => {
  it('prints litres, averages and counts', () => {
    expect(awardValue({ key: 'bier', memberIds: ['a'], value: 350 })).toBe('3,50')
    expect(awardValue({ key: 'orator', memberIds: ['a'], value: 4.5 })).toBe('4,5')
    expect(awardValue({ key: 'hand', memberIds: ['a'], value: 1287 })).toBe('1\u00a0287')
  })

  it('finds the awards a member holds, shared ones too', () => {
    const awards = computeAwards(log({ drinks: [drink('a', 'mass'), drink('b', 'mass'), drink('c', 'wasser')] }))
    expect(awardsOf(awards, 'a').map((a) => a.key)).toEqual(['bier'])
    expect(awardsOf(awards, 'c').map((a) => a.key)).toEqual(['wasser'])
    expect(awardsOf(awards, 'd')).toEqual([])
  })
})

describe('finaleStep', () => {
  const end = 1_000_000

  it('opens with the intro', () => {
    expect(finaleStep(end, 3, end)).toEqual({ phase: 'intro', startsAt: end })
    expect(finaleStep(end, 3, end + FINALE_INTRO_MS - 1).phase).toBe('intro')
  })

  it('steps through the awards, each with its drum roll', () => {
    const first = end + FINALE_INTRO_MS
    expect(finaleStep(end, 3, first)).toEqual({ phase: 'award', index: 0, startsAt: first, revealAt: first + FINALE_REVEAL_MS })
    expect(finaleStep(end, 3, first + FINALE_AWARD_MS - 1)).toMatchObject({ phase: 'award', index: 0 })
    expect(finaleStep(end, 3, first + 2 * FINALE_AWARD_MS)).toMatchObject({ phase: 'award', index: 2 })
  })

  it('ends on the standings, which stay', () => {
    const last = end + finaleLength(3)
    expect(finaleStep(end, 3, last)).toEqual({ phase: 'standings', startsAt: last })
    expect(finaleStep(end, 3, last + 3_600_000)).toEqual({ phase: 'standings', startsAt: last })
  })

  it('goes straight from the intro to the standings without awards', () => {
    expect(finaleStep(end, 0, end + FINALE_INTRO_MS)).toEqual({ phase: 'standings', startsAt: end + FINALE_INTRO_MS })
  })
})
