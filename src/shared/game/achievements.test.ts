import { describe, expect, it } from 'vitest'
import { computeAchievements, HATTRICK_MS } from './achievements'
import type { NightLog } from './awards'
import type { DrinkKind } from './types'

const members = ['a', 'b', 'c']
const drink = (memberId: string, kind: DrinkKind, at: number) => ({ memberId, kind, at })
const log = (parts: Partial<NightLog>): NightLog => ({ memberIds: members, drinks: [], strafen: [], points: [], events: [], ...parts })
type Row = NightLog['events'][number]
const keys = (l: NightLog) => computeAchievements(l).map((a) => a.id)

describe('computeAchievements', () => {
  it('finds nothing on an empty night', () => {
    expect(computeAchievements(log({}))).toEqual([])
  })

  it('gives the first Maß and the first Wasser of the club to one member each', () => {
    const l = log({ drinks: [drink('b', 'mass', 2), drink('a', 'mass', 3), drink('c', 'wasser', 1), drink('a', 'wasser', 4)] })
    expect(computeAchievements(l)).toEqual([
      { id: 'wasser:c', key: 'wasser', memberId: 'c', at: 1 },
      { id: 'anstich:b', key: 'anstich', memberId: 'b', at: 2 },
      { id: 'liter1:b', key: 'liter1', memberId: 'b', at: 2 },
      { id: 'liter1:a', key: 'liter1', memberId: 'a', at: 3 },
    ])
  })

  it('marks each litre once, at the drink that crossed it', () => {
    const drinks = [1, 2, 3, 4, 5, 6].map((i) => drink('a', 'ol', i * HATTRICK_MS))
    const got = computeAchievements(log({ drinks }))
    expect(got.map((a) => [a.key, a.at])).toEqual([
      ['liter1', 2 * HATTRICK_MS],
      ['liter2', 4 * HATTRICK_MS],
      ['liter3', 6 * HATTRICK_MS],
    ])
  })

  it('jumps several litres at once and counts no Wasser', () => {
    const l = log({ drinks: [drink('a', 'mass', 1), drink('a', 'wasser', 2), drink('a', 'mass', 3), drink('a', 'mass', 4)] })
    expect(keys(l).filter((k) => k.startsWith('liter'))).toEqual(['liter1:a', 'liter2:a', 'liter3:a'])
  })

  it('needs three noble drinks within the window for a Hattrick', () => {
    const slow = [0, HATTRICK_MS / 2, HATTRICK_MS + 1].map((at) => drink('a', 'schnaps', at))
    expect(keys(log({ drinks: slow }))).toEqual(['schnaps3:a'])
    const fast = [0, 1, HATTRICK_MS].map((at) => drink('b', 'schnaps', at))
    expect(keys(log({ drinks: fast }))).toEqual(['hattrick:b', 'schnaps3:b'])
  })

  it('does not count an undone drink (the row is gone)', () => {
    expect(keys(log({ drinks: [drink('a', 'ol', 1)] }))).toEqual([])
  })

  it('counts the third and fifth Strafe', () => {
    const strafen = [5, 1, 4, 2, 3].map((at) => ({ memberId: 'c', givenBy: null, at }))
    expect(computeAchievements(log({ strafen })).map((a) => [a.key, a.at])).toEqual([
      ['strafe3', 3],
      ['strafe5', 5],
    ])
  })

  it('reads the events once they are resolved', () => {
    const won = (winner: string, resolvedAt: number): Row => ({
      payload: { kind: 'duell', a: 'a', b: 'b', drawAfterMs: 0 },
      result: { kind: 'duell', winner, loser: 'x', reactions: {}, falseStarts: [] },
      resolvedAt,
    })
    const first = (resolvedAt: number): Row => ({
      payload: { kind: 'prosit' },
      result: { kind: 'prosit', order: ['c', 'a'], missed: [] },
      resolvedAt,
    })
    const l = log({
      events: [
        won('a', 10),
        first(20),
        won('b', 30),
        first(40),
        won('a', 50),
        first(60),
        { payload: { kind: 'prosit' }, result: null, resolvedAt: null },
        {
          payload: { kind: 'trinkspruch', speaker: 'b', topic: 't' },
          result: { kind: 'trinkspruch', average: 4.5, ratings: {} },
          resolvedAt: 70,
        },
        {
          payload: { kind: 'trinkspruch', speaker: 'c', topic: 't' },
          result: { kind: 'trinkspruch', average: 4.4, ratings: {} },
          resolvedAt: 75,
        },
        {
          payload: { kind: 'schatzfrage', question: 'q', answer: 3.5, unit: '' },
          result: { kind: 'schatzfrage', closest: 'c', furthest: 'b', guesses: { c: 3.5, a: 3.5, b: 9 } },
          resolvedAt: 80,
        },
      ],
    })
    expect(keys(l)).toEqual(['duell2:a', 'prosit3:c', 'orator:b', 'volltreffer:a', 'volltreffer:c'])
  })

  it('ignores members who are not in the club', () => {
    expect(keys(log({ drinks: [drink('x', 'mass', 1), drink('a', 'mass', 2)] }))).toEqual(['anstich:a', 'liter1:a'])
  })

  it('is the same whatever order the rows arrive in', () => {
    const drinks = [drink('a', 'ol', 3), drink('b', 'mass', 1), drink('a', 'ol', 2), drink('a', 'ol', 4)]
    expect(computeAchievements(log({ drinks }))).toEqual(computeAchievements(log({ drinks: [...drinks].reverse() })))
  })
})

describe('besinnung', () => {
  it('honours a Wasser after three Maß in a row, once', () => {
    const drinks = [
      drink('a', 'mass', 1),
      drink('a', 'ol', 2),
      drink('a', 'mass', 3),
      drink('b', 'wasser', 4),
      drink('a', 'mass', 5),
      drink('a', 'wasser', 6),
      drink('a', 'mass', 7),
      drink('a', 'mass', 8),
      drink('a', 'mass', 9),
      drink('a', 'wasser', 10),
    ]
    expect(computeAchievements(log({ drinks })).filter((x) => x.key === 'besinnung')).toEqual([
      { id: 'besinnung:a', key: 'besinnung', memberId: 'a', at: 6 },
    ])
  })

  it('needs the Maß first', () => {
    const drinks = [drink('a', 'mass', 1), drink('a', 'mass', 2), drink('a', 'wasser', 3), drink('a', 'mass', 4)]
    expect(keys(log({ drinks }))).not.toContain('besinnung:a')
  })
})
