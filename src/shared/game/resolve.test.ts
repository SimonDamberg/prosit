import { describe, expect, it } from 'vitest'
import { AWARD_REASONS } from '../content/events'
import {
  DUELL_PICK_POINTS,
  DUELL_POINTS,
  PROSIT_POINTS,
  resolve,
  SCHATZ_POINTS,
  TRINKSPRUCH_FLOOR,
  type Answer,
} from './resolve'

const members = ['a', 'b', 'c', 'd', 'e']
const tap = (memberId: string, at: number): Answer => ({ memberId, payload: { kind: 'prosit' }, at })

describe('resolve PROSIT!', () => {
  it('rewards the fastest and punishes the last when everyone taps', () => {
    const answers = [tap('c', 300), tap('a', 100), tap('e', 500), tap('b', 200), tap('d', 400)]
    expect(resolve({ kind: 'prosit' }, answers, members)).toEqual({
      result: { kind: 'prosit', order: ['a', 'b', 'c', 'd', 'e'], missed: [] },
      points: [{ memberId: 'a', amount: PROSIT_POINTS, reason: AWARD_REASONS.prositFirst }],
      strafen: [{ memberId: 'e', reason: AWARD_REASONS.prositLast }],
    })
  })

  it('punishes the last to tap and everyone who missed', () => {
    const res = resolve({ kind: 'prosit' }, [tap('b', 2), tap('d', 1)], members)
    expect(res.result).toEqual({ kind: 'prosit', order: ['d', 'b'], missed: ['a', 'c', 'e'] })
    expect(res.points.map((p) => p.memberId)).toEqual(['d'])
    expect(res.strafen).toEqual([
      { memberId: 'b', reason: AWARD_REASONS.prositLast },
      { memberId: 'a', reason: AWARD_REASONS.prositMissed },
      { memberId: 'c', reason: AWARD_REASONS.prositMissed },
      { memberId: 'e', reason: AWARD_REASONS.prositMissed },
    ])
  })

  it('does not punish a lone tapper for being last', () => {
    const res = resolve({ kind: 'prosit' }, [tap('c', 1)], members)
    expect(res.points.map((p) => p.memberId)).toEqual(['c'])
    expect(res.strafen.map((s) => s.memberId)).toEqual(['a', 'b', 'd', 'e'])
  })

  it('punishes everyone when nobody taps', () => {
    const res = resolve({ kind: 'prosit' }, [], members)
    expect(res.result).toEqual({ kind: 'prosit', order: [], missed: members })
    expect(res.points).toEqual([])
    expect(res.strafen).toHaveLength(5)
  })

  it('does not depend on the order of its inputs, and breaks ties by id', () => {
    const answers = [tap('d', 7), tap('b', 7), tap('a', 9), tap('c', 7)]
    const one = resolve({ kind: 'prosit' }, answers, members)
    const two = resolve({ kind: 'prosit' }, [...answers].reverse(), [...members].reverse())
    expect(two).toEqual(one)
    expect(one.result).toEqual({ kind: 'prosit', order: ['b', 'c', 'd', 'a'], missed: ['e'] })
  })

  it('ignores strangers and answers of another kind', () => {
    const answers: Answer[] = [tap('x', 1), { memberId: 'a', payload: { kind: 'schatzfrage', guess: 3 }, at: 2 }, tap('b', 3)]
    const res = resolve({ kind: 'prosit' }, answers, ['a', 'b'])
    expect(res.result).toEqual({ kind: 'prosit', order: ['b'], missed: ['a'] })
  })

  it('survives a JSON round trip', () => {
    const res = resolve({ kind: 'prosit' }, [tap('a', 1), tap('b', 2)], members)
    expect(JSON.parse(JSON.stringify(res))).toEqual(res)
  })
})

describe('resolve Regel', () => {
  it('ends without awards', () => {
    expect(resolve({ kind: 'regel', rule: 'Ingen nämner jobbet' }, [], members)).toEqual({
      result: { kind: 'regel' },
      points: [],
      strafen: [],
    })
  })
})

describe('resolve Duell', () => {
  const duell = { kind: 'duell', a: 'b', b: 'd', drawAfterMs: 30_000 } as const
  const shot = (memberId: string, tapMs: number, at = tapMs): Answer => ({ memberId, payload: { kind: 'duell', tapMs }, at })
  const pick = (memberId: string, on: string, at = 1): Answer => ({ memberId, payload: { kind: 'duell_pick', pick: on }, at })

  it('gives the fastest tap after the draw the win, and pays the bystanders who saw it coming', () => {
    const answers = [pick('a', 'd'), pick('c', 'b'), pick('e', 'd'), shot('b', 30_420), shot('d', 30_310)]
    expect(resolve(duell, answers, members)).toEqual({
      result: { kind: 'duell', winner: 'd', loser: 'b', reactions: { b: 420, d: 310 }, falseStarts: [] },
      points: [
        { memberId: 'd', amount: DUELL_POINTS, reason: AWARD_REASONS.duellWon },
        { memberId: 'a', amount: DUELL_PICK_POINTS, reason: AWARD_REASONS.duellPick },
        { memberId: 'e', amount: DUELL_PICK_POINTS, reason: AWARD_REASONS.duellPick },
      ],
      strafen: [{ memberId: 'b', reason: AWARD_REASONS.duellLost }],
    })
  })

  it('makes an early tap lose, even if the other never taps', () => {
    const early = resolve(duell, [shot('b', 12_000), shot('d', 31_000)], members)
    expect(early.result).toEqual({ kind: 'duell', winner: 'd', loser: 'b', reactions: { d: 1000 }, falseStarts: ['b'] })
    expect(early.strafen).toEqual([{ memberId: 'b', reason: AWARD_REASONS.duellFalseStart }])

    const alone = resolve(duell, [shot('d', 30_900)], members)
    expect(alone.result).toMatchObject({ winner: 'd', loser: 'b' })
    expect(alone.strafen).toEqual([{ memberId: 'b', reason: AWARD_REASONS.duellLost }])
  })

  it('has no winner when both jump the draw or nobody taps: two Strafen, no points', () => {
    const both = resolve(duell, [shot('d', 100), shot('b', 200), pick('a', 'b')], members)
    expect(both.result).toEqual({ kind: 'duell', winner: null, loser: null, reactions: {}, falseStarts: ['b', 'd'] })
    expect(both.points).toEqual([])
    expect(both.strafen).toEqual([
      { memberId: 'b', reason: AWARD_REASONS.duellFalseStart },
      { memberId: 'd', reason: AWARD_REASONS.duellFalseStart },
    ])

    const none = resolve(duell, [], members)
    expect(none.strafen).toEqual([
      { memberId: 'b', reason: AWARD_REASONS.duellNoShow },
      { memberId: 'd', reason: AWARD_REASONS.duellNoShow },
    ])
  })

  it('breaks a dead heat by who the database heard first', () => {
    const res = resolve(duell, [shot('d', 30_300, 9), shot('b', 30_300, 8)], members)
    expect(res.result).toMatchObject({ winner: 'b', loser: 'd' })
  })

  it('ignores taps from bystanders, picks from duellists and picks of nobody', () => {
    const answers = [shot('a', 30_001), pick('b', 'b'), shot('d', 30_500, 5), pick('c', 'x'), pick('e', 'a')]
    const res = resolve(duell, answers, members)
    expect(res.result).toMatchObject({ winner: 'd', loser: 'b', reactions: { d: 500 } })
    expect(res.points).toEqual([{ memberId: 'd', amount: DUELL_POINTS, reason: AWARD_REASONS.duellWon }])
  })

  it('does not depend on the order of its inputs', () => {
    const answers = [pick('a', 'd', 3), shot('b', 30_420, 7), shot('d', 30_310, 6), pick('e', 'd', 2)]
    expect(resolve(duell, [...answers].reverse(), [...members].reverse())).toEqual(resolve(duell, answers, members))
  })
})

describe('resolve Abstimmung', () => {
  const question = { kind: 'abstimmung', question: 'Vem?', title: 'Klubbens Besserwisser' } as const
  const vote = (memberId: string, on: string, at = 1): Answer => ({ memberId, payload: { kind: 'abstimmung', vote: on }, at })

  it('counts the votes and names the winner, without points or Strafen', () => {
    const answers = [vote('a', 'c'), vote('b', 'c'), vote('c', 'a'), vote('d', 'c'), vote('e', 'e')]
    expect(resolve(question, answers, members)).toEqual({
      result: { kind: 'abstimmung', winners: ['c'], votes: { c: 3, a: 1, e: 1 } },
      points: [],
      strafen: [],
    })
  })

  it('shares the title on a tie', () => {
    const res = resolve(question, [vote('a', 'd'), vote('b', 'b'), vote('c', 'd'), vote('d', 'b')], members)
    expect(res.result).toMatchObject({ winners: ['b', 'd'] })
  })

  it('has no winner without votes, and ignores votes for or from strangers', () => {
    expect(resolve(question, [], members).result).toEqual({ kind: 'abstimmung', winners: [], votes: {} })
    const res = resolve(question, [vote('a', 'x'), vote('x', 'a'), vote('b', 'a')], members)
    expect(res.result).toEqual({ kind: 'abstimmung', winners: ['a'], votes: { a: 1 } })
  })
})

describe('resolve Schätzfrage', () => {
  const question = { kind: 'schatzfrage', question: 'När?', answer: 1516, unit: 'år' } as const
  const guess = (memberId: string, value: number, at = 1): Answer => ({ memberId, payload: { kind: 'schatzfrage', guess: value }, at })

  it('rewards the closest and punishes the furthest', () => {
    const answers = [guess('a', 1500), guess('b', 1520), guess('c', 1800), guess('d', 1400)]
    expect(resolve(question, answers, members)).toEqual({
      result: { kind: 'schatzfrage', closest: 'b', furthest: 'c', guesses: { a: 1500, b: 1520, c: 1800, d: 1400 } },
      points: [{ memberId: 'b', amount: SCHATZ_POINTS, reason: AWARD_REASONS.schatzClosest }],
      strafen: [{ memberId: 'c', reason: AWARD_REASONS.schatzFurthest }],
    })
  })

  it('on equal distances calls the earlier answer closer and the later one further', () => {
    const res = resolve(question, [guess('a', 1526, 3), guess('b', 1506, 2), guess('c', 1616, 5), guess('d', 1416, 4)], members)
    expect(res.result).toMatchObject({ closest: 'b', furthest: 'c' })
  })

  it('hands out no Strafe when nobody was further off than the best', () => {
    expect(resolve(question, [guess('a', 1516), guess('b', 1516, 2)], members).strafen).toEqual([])
    const lone = resolve(question, [guess('c', 3)], members)
    expect(lone.result).toMatchObject({ closest: 'c', furthest: null })
    expect(lone.points.map((p) => p.memberId)).toEqual(['c'])
    expect(lone.strafen).toEqual([])
  })

  it('copes with no guesses and drops ones that are not numbers', () => {
    expect(resolve(question, [], members)).toEqual({
      result: { kind: 'schatzfrage', closest: null, furthest: null, guesses: {} },
      points: [],
      strafen: [],
    })
    const res = resolve(question, [guess('a', Number.NaN), guess('b', Infinity), guess('c', 10)], members)
    expect(res.result).toMatchObject({ closest: 'c', guesses: { c: 10 } })
  })
})

describe('resolve Trinkspruch', () => {
  const toast = { kind: 'trinkspruch', speaker: 'c', topic: 'Till ölet' } as const
  const rate = (memberId: string, rating: number, at = 1): Answer => ({ memberId, payload: { kind: 'trinkspruch', rating }, at })

  it('pays the speaker the rounded average', () => {
    const res = resolve(toast, [rate('a', 5), rate('b', 4), rate('d', 4), rate('e', 2)], members)
    expect(res).toEqual({
      result: { kind: 'trinkspruch', average: 3.8, ratings: { a: 5, b: 4, d: 4, e: 2 } },
      points: [{ memberId: 'c', amount: 4, reason: AWARD_REASONS.trinkspruch }],
      strafen: [],
    })
  })

  it('punishes a speech rated under the floor', () => {
    const res = resolve(toast, [rate('a', 1), rate('b', 2), rate('d', 1)], members)
    expect(res.result).toMatchObject({ average: 1.3 })
    expect(res.points).toEqual([])
    expect(res.strafen).toEqual([{ memberId: 'c', reason: AWARD_REASONS.trinkspruchBad }])
    expect(resolve(toast, [rate('a', TRINKSPRUCH_FLOOR)], members).strafen).toEqual([])
  })

  it('ignores the speaker rating himself and ratings outside 1 to 5', () => {
    const res = resolve(toast, [rate('c', 5), rate('a', 0), rate('b', 6), rate('d', 2.5), rate('e', 3)], members)
    expect(res.result).toEqual({ kind: 'trinkspruch', average: 3, ratings: { e: 3 } })
  })

  it('awards nothing when nobody rates', () => {
    expect(resolve(toast, [], members)).toEqual({ result: { kind: 'trinkspruch', average: null, ratings: {} }, points: [], strafen: [] })
  })
})

describe('resolve', () => {
  it('survives a JSON round trip for every kind', () => {
    const all = [
      resolve({ kind: 'duell', a: 'a', b: 'b', drawAfterMs: 10 }, [{ memberId: 'a', payload: { kind: 'duell', tapMs: 300.4 }, at: 1 }], members),
      resolve({ kind: 'abstimmung', question: '?', title: 'T' }, [{ memberId: 'a', payload: { kind: 'abstimmung', vote: 'b' }, at: 1 }], members),
      resolve({ kind: 'schatzfrage', question: '?', answer: 1, unit: 'st' }, [], members),
      resolve({ kind: 'trinkspruch', speaker: 'a', topic: 'T' }, [], members),
    ]
    for (const res of all) expect(JSON.parse(JSON.stringify(res))).toEqual(res)
  })
})
