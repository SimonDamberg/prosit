import { describe, expect, it } from 'vitest'
import { fmtClock, fmtInt } from './format'

describe('fmtInt', () => {
  it('groups thousands with a no-break space', () => {
    expect(fmtInt(0)).toBe('0')
    expect(fmtInt(999)).toBe('999')
    expect(fmtInt(12345)).toBe('12\u00a0345')
    expect(fmtInt(-1000)).toBe('-1\u00a0000')
    expect(fmtInt(1.6)).toBe('2')
  })
})

describe('fmtClock', () => {
  it('formats minutes and seconds', () => {
    expect(fmtClock(47)).toBe('0:47')
    expect(fmtClock(90)).toBe('1:30')
    expect(fmtClock(5)).toBe('0:05')
    expect(fmtClock(-3)).toBe('0:00')
  })
})
