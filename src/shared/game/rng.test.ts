import { describe, expect, it } from 'vitest'
import { createRng, randomSeed } from './rng'

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = createRng(42)
    const b = createRng(42)
    const seqA = Array.from({ length: 50 }, () => a.next())
    const seqB = Array.from({ length: 50 }, () => b.next())
    expect(seqA).toEqual(seqB)
    const c = createRng(43)
    expect(Array.from({ length: 50 }, () => c.next())).not.toEqual(seqA)
  })

  it('produces floats in [0, 1) and ints in range', () => {
    const r = createRng(7)
    for (let i = 0; i < 10000; i++) {
      const x = r.next()
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(1)
      const k = r.int(6)
      expect(Number.isInteger(k) && k >= 0 && k < 6).toBe(true)
      const f = r.float(0.72, 1.3)
      expect(f >= 0.72 && f < 1.3).toBe(true)
    }
  })

  it('shuffle returns a permutation without mutating the input', () => {
    const r = createRng(1)
    const input = [1, 2, 3, 4, 5, 6, 7, 8]
    const out = r.shuffle(input)
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect([...out].sort((a, b) => a - b)).toEqual(input)
  })

  it('randomSeed fits a non-negative 31-bit int', () => {
    for (let i = 0; i < 100; i++) {
      const s = randomSeed()
      expect(Number.isInteger(s) && s >= 0 && s < 2 ** 31).toBe(true)
    }
  })
})
