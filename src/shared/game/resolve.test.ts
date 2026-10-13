import { describe, expect, it } from 'vitest'
import { AWARD_REASONS } from '../content/events'
import { PROSIT_POINTS, resolve, type Answer } from './resolve'

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

describe('resolve', () => {
  it('refuses kinds that are not built yet', () => {
    expect(() => resolve({ kind: 'abstimmung', question: '?' }, [], members)).toThrow()
  })
})
