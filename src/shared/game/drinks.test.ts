import { describe, expect, it } from 'vitest'
import {
  CENTILITRES,
  paceSeries,
  placeOf,
  rankTallies,
  strafeTally,
  sumTallies,
  tallyDrinks,
  type DrinkEntry,
} from './drinks'
import { DRINK_KINDS } from './types'

const d = (memberId: string, kind: DrinkEntry['kind'], at = 0): DrinkEntry => ({ memberId, kind, at })

describe('CENTILITRES', () => {
  it('has a positive whole volume for every kind', () => {
    for (const kind of DRINK_KINDS) {
      expect(Number.isInteger(CENTILITRES[kind])).toBe(true)
      expect(CENTILITRES[kind]).toBeGreaterThan(0)
    }
  })
})

describe('tallyDrinks', () => {
  it('returns an empty tally per member, in the given order', () => {
    const t = tallyDrinks([], ['b', 'a'])
    expect(t.map((x) => x.memberId)).toEqual(['b', 'a'])
    expect(t[0]).toEqual({ memberId: 'b', counts: { ol: 0, mass: 0, schnaps: 0, wasser: 0 }, drinks: 0, cl: 0 })
  })

  it('counts every kind but keeps Wasser out of drinks and cl', () => {
    const [a] = tallyDrinks([d('a', 'ol'), d('a', 'ol'), d('a', 'mass'), d('a', 'schnaps'), d('a', 'wasser')], ['a'])
    expect(a.counts).toEqual({ ol: 2, mass: 1, schnaps: 1, wasser: 1 })
    expect(a.drinks).toBe(4)
    expect(a.cl).toBe(50 + 50 + 100 + 4)
  })

  it('ignores drinks from members not in the list', () => {
    const t = tallyDrinks([d('ghost', 'mass'), d('a', 'ol')], ['a'])
    expect(t).toHaveLength(1)
    expect(t[0].cl).toBe(50)
  })
})

describe('sumTallies', () => {
  it('adds up the club', () => {
    const total = sumTallies(tallyDrinks([d('a', 'ol'), d('b', 'mass'), d('b', 'wasser')], ['a', 'b']))
    expect(total.counts).toEqual({ ol: 1, mass: 1, schnaps: 0, wasser: 1 })
    expect(total.drinks).toBe(2)
    expect(total.cl).toBe(150)
  })
})

describe('rankTallies and placeOf', () => {
  const tallies = tallyDrinks(
    [d('a', 'ol'), d('b', 'mass'), d('c', 'ol'), d('c', 'schnaps'), d('d', 'schnaps'), d('d', 'schnaps')],
    ['a', 'b', 'c', 'd', 'e'],
  )

  it('orders by centilitres, then by drinks, then by incoming order', () => {
    expect(rankTallies(tallies).map((t) => t.memberId)).toEqual(['b', 'c', 'a', 'd', 'e'])
    const tie = tallyDrinks([d('x', 'mass'), d('y', 'ol'), d('y', 'ol')], ['x', 'y', 'z', 'w'])
    expect(rankTallies(tie).map((t) => t.memberId)).toEqual(['y', 'x', 'z', 'w'])
  })

  it('does not mutate its input', () => {
    const before = tallies.map((t) => t.memberId)
    rankTallies(tallies)
    expect(tallies.map((t) => t.memberId)).toEqual(before)
  })

  it('gives shared places on equal volume', () => {
    const tie = tallyDrinks([d('x', 'mass'), d('y', 'ol'), d('y', 'ol')], ['x', 'y', 'z'])
    expect(placeOf(tie, 'x')).toBe(1)
    expect(placeOf(tie, 'y')).toBe(1)
    expect(placeOf(tie, 'z')).toBe(3)
    expect(placeOf(tie, 'nobody')).toBe(0)
  })
})

describe('paceSeries', () => {
  const drinks = [d('a', 'ol', 100), d('a', 'mass', 500), d('a', 'wasser', 200), d('b', 'schnaps', 1000), d('a', 'ol', 2000)]

  it('samples evenly from start to end inclusive', () => {
    const s = paceSeries(drinks, ['a'], 0, 1000, 4)
    expect(s.times).toEqual([0, 250, 500, 750, 1000])
  })

  it('accumulates noble centilitres and leaves out later drinks', () => {
    const s = paceSeries(drinks, ['a', 'b'], 0, 1000, 4)
    expect(s.cl.a).toEqual([0, 50, 150, 150, 150])
    expect(s.cl.b).toEqual([0, 0, 0, 0, 4])
  })

  it('counts drinks before the start from the first sample', () => {
    const s = paceSeries(drinks, ['a'], 600, 1000, 2)
    expect(s.cl.a).toEqual([150, 150, 150])
  })

  it('handles unsorted input, an empty span and members without drinks', () => {
    const s = paceSeries([d('a', 'mass', 500), d('a', 'ol', 100)], ['a', 'c'], 1000, 1000, 2)
    expect(s.times).toEqual([1000, 1000, 1000])
    expect(s.cl.a).toEqual([150, 150, 150])
    expect(s.cl.c).toEqual([0, 0, 0])
  })

  it('is deterministic', () => {
    expect(paceSeries(drinks, ['a', 'b'], 0, 3000, 30)).toEqual(paceSeries(drinks, ['a', 'b'], 0, 3000, 30))
  })
})

describe('strafeTally', () => {
  it('counts per member', () => {
    expect(strafeTally([{ memberId: 'a' }, { memberId: 'b' }, { memberId: 'a' }])).toEqual({ a: 2, b: 1 })
    expect(strafeTally([])).toEqual({})
  })
})
