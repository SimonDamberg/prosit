import { describe, expect, it } from 'vitest'
import { CUE_NAMES, CUES, cueLength, hz, type CueName } from './score'

/** Cues that play on top of something else and must be over at once. */
const SHORT: readonly CueName[] = ['draw', 'tick', 'unlock']

describe('hz', () => {
  it('knows concert pitch and its octaves', () => {
    expect(hz('A4')).toBeCloseTo(440)
    expect(hz('A3')).toBeCloseTo(220)
    expect(hz('C4')).toBeCloseTo(261.63, 1)
  })

  it('reads sharps and flats', () => {
    expect(hz('Bb3')).toBeCloseTo(hz('A#3'))
    expect(hz('Db4')).toBeGreaterThan(hz('C4'))
  })

  it('refuses what is not a note', () => {
    expect(() => hz('H4')).toThrow()
  })
})

describe.each(CUE_NAMES)('cue %s', (name) => {
  const cue = CUES[name]

  it('has notes a speaker can play', () => {
    expect(cue.length).toBeGreaterThan(0)
    for (const n of cue) {
      expect(n.freq).toBeGreaterThan(20)
      expect(n.freq).toBeLessThan(8000)
      expect(n.dur).toBeGreaterThan(0)
      expect(n.vol).toBeGreaterThan(0)
      expect(n.vol).toBeLessThanOrEqual(1)
      expect(n.at).toBeGreaterThanOrEqual(0)
    }
  })

  it('starts at once and does not outstay its welcome', () => {
    expect(Math.min(...cue.map((n) => n.at))).toBe(0)
    expect(cueLength(cue)).toBeLessThanOrEqual(SHORT.includes(name) ? 2 : 8)
  })
})
