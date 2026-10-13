import { describe, expect, it } from 'vitest'
import { MAX_PLAUSIBLE_OFFSET_MS, measureOffset, serverTime, usableOffset } from './clock'

describe('measureOffset', () => {
  it('is zero when the clocks agree and the round trip is symmetric', () => {
    // Sent at 1000, back at 1200, server read its clock at the midpoint 1100.
    expect(measureOffset(1100, 1000, 1200)).toBe(0)
  })

  it('reports how far the local clock is behind the server', () => {
    // Local clock runs 5 s slow: the server says 6100 when locally it is 1100.
    expect(measureOffset(6100, 1000, 1200)).toBe(5000)
  })

  it('reports a local clock running fast as a negative offset', () => {
    expect(measureOffset(1100, 6000, 6200)).toBe(-5000)
  })

  it('charges half the round trip to each direction', () => {
    // A 400 ms round trip with clocks in sync still measures as no offset.
    expect(measureOffset(1200, 1000, 1400)).toBe(0)
  })
})

describe('serverTime', () => {
  it('shifts the local clock by the offset', () => {
    expect(serverTime(5000, 1000)).toBe(6000)
    expect(serverTime(-250, 1000)).toBe(750)
    expect(serverTime(0, 1000)).toBe(1000)
  })
})

describe('usableOffset', () => {
  it('keeps a plausible offset', () => {
    expect(usableOffset(4200)).toBe(4200)
    expect(usableOffset(-4200)).toBe(-4200)
  })

  it('falls back to the local clock on a nonsense measurement', () => {
    expect(usableOffset(MAX_PLAUSIBLE_OFFSET_MS + 1)).toBe(0)
    expect(usableOffset(-MAX_PLAUSIBLE_OFFSET_MS - 1)).toBe(0)
    expect(usableOffset(Number.NaN)).toBe(0)
    expect(usableOffset(Number.POSITIVE_INFINITY)).toBe(0)
  })
})
