import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createToastStore, TOAST_MAX, TOAST_MS } from './toast'

describe('toast store', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('pushes, notifies and dismisses', () => {
    const store = createToastStore()
    const listener = vi.fn()
    store.subscribe(listener)
    const id = store.push({ text: 'Prost' })
    expect(store.getSnapshot()).toEqual([{ id, text: 'Prost', tone: 'info' }])
    expect(listener).toHaveBeenCalledTimes(1)
    store.dismiss(id)
    expect(store.getSnapshot()).toEqual([])
    expect(listener).toHaveBeenCalledTimes(2)
    store.dismiss(id)
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it(`keeps at most ${TOAST_MAX}, dropping the oldest`, () => {
    const store = createToastStore()
    for (let i = 0; i < TOAST_MAX + 2; i++) store.push({ text: `t${i}` })
    expect(store.getSnapshot().map((t) => t.text)).toEqual(['t2', 't3', 't4'])
  })

  it('auto-dismisses after the delay', () => {
    const store = createToastStore()
    store.push({ text: 'kort', ms: 1000 })
    store.push({ text: 'standard', tone: 'win' })
    vi.advanceTimersByTime(1000)
    expect(store.getSnapshot().map((t) => t.text)).toEqual(['standard'])
    vi.advanceTimersByTime(TOAST_MS)
    expect(store.getSnapshot()).toEqual([])
  })

  it('returns a stable snapshot between changes', () => {
    const store = createToastStore()
    store.push({ text: 'a' })
    expect(store.getSnapshot()).toBe(store.getSnapshot())
  })
})
