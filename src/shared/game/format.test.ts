import { describe, expect, it } from 'vitest'
import { fmtClock, fmtInt, fmtLitres } from './format'

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

describe('fmtLitres', () => {
  it('shows centilitres as litres with a decimal comma', () => {
    expect(fmtLitres(0)).toBe('0,0')
    expect(fmtLitres(354)).toBe('3,5')
    expect(fmtLitres(50)).toBe('0,5')
    expect(fmtLitres(4, 2)).toBe('0,04')
    expect(fmtLitres(123456)).toBe('1\u00a0234,6')
  })

  it('can drop the decimals and never goes negative', () => {
    expect(fmtLitres(260, 0)).toBe('3')
    expect(fmtLitres(-50)).toBe('0,0')
  })
})
