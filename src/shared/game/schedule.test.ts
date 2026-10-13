import { describe, expect, it } from 'vitest'
import { RULES, ruleBreach } from '../content/rules'
import { MAX_REASON_LENGTH } from './members'
import {
  ENABLED_KINDS,
  GAP_MAX,
  GAP_MIN,
  nextAction,
  onStage,
  pickFair,
  planEvent,
  PROSIT_MS,
  REGEL_MS,
  RESOLVE_GRACE_MS,
  RESULT_MS,
  type EngineEvent,
  type EngineState,
} from './schedule'

const SEEDS = [0, 1, 42, 1887, 123456789, 2147483646]

describe('planEvent', () => {
  it('gives the same plan for the same inputs, and survives a JSON round trip', () => {
    for (const seed of SEEDS) {
      for (let seq = 1; seq <= 30; seq++) {
        const plan = planEvent(seed, seq, 12)
        expect(planEvent(seed, seq, 12)).toEqual(plan)
        expect(JSON.parse(JSON.stringify(plan))).toEqual(plan)
        expect(plan.seq).toBe(seq)
        expect(plan.payload.kind).toBe(plan.kind)
        expect(ENABLED_KINDS).toContain(plan.kind)
      }
    }
  })

  it('differs between seeds', () => {
    const line = (seed: number) => Array.from({ length: 20 }, (_, i) => planEvent(seed, i + 1, 12).gapMs)
    expect(line(1)).not.toEqual(line(2))
  })

  it('never draws the same kind twice in a row', () => {
    for (const seed of SEEDS) {
      let prev = ''
      for (let seq = 1; seq <= 200; seq++) {
        const { kind } = planEvent(seed, seq, 12)
        expect(kind).not.toBe(prev)
        prev = kind
      }
    }
  })

  it('keeps the wait within 8 to 15 minutes at the default interval', () => {
    for (const seed of SEEDS) {
      for (let seq = 1; seq <= 100; seq++) {
        const { gapMs } = planEvent(seed, seq, 12)
        expect(gapMs).toBeGreaterThanOrEqual(12 * 60_000 * GAP_MIN)
        expect(gapMs).toBeLessThanOrEqual(12 * 60_000 * GAP_MAX)
      }
    }
  })

  it('scales the wait with the interval but keeps kind and payload', () => {
    const a = planEvent(42, 7, 12)
    const b = planEvent(42, 7, 6)
    expect(b.kind).toBe(a.kind)
    expect(b.payload).toEqual(a.payload)
    expect(Math.abs(b.gapMs - a.gapMs / 2)).toBeLessThanOrEqual(1)
  })

  it('caps how long an event lasts at one interval', () => {
    for (let seq = 1; seq <= 10; seq++) {
      const long = planEvent(42, seq, 12)
      expect(long.durationMs).toBe(long.kind === 'prosit' ? PROSIT_MS : REGEL_MS)
      expect(planEvent(42, seq, 0.5).durationMs).toBe(30_000)
    }
  })

  it('uses every rule once before any comes back', () => {
    for (const seed of SEEDS) {
      const rules: string[] = []
      for (let seq = 1; rules.length < RULES.length * 2; seq++) {
        const { payload } = planEvent(seed, seq, 12)
        if (payload.kind === 'regel') rules.push(payload.rule)
      }
      const first = rules.slice(0, RULES.length)
      expect([...first].sort()).toEqual([...RULES].sort())
      expect(rules.slice(RULES.length)).toEqual(first)
    }
  })
})

describe('rule pool', () => {
  it('fits a Strafe reason and has no duplicates', () => {
    expect(new Set(RULES).size).toBe(RULES.length)
    for (const rule of RULES) expect([...ruleBreach(rule)].length).toBeLessThanOrEqual(MAX_REASON_LENGTH)
  })
})

describe('pickFair', () => {
  const ids = ['e', 'b', 'a', 'd', 'c']

  it('is deterministic and ignores the order of the member list', () => {
    expect(pickFair(42, ids, 3)).toEqual(pickFair(42, [...ids].reverse(), 3))
  })

  it('picks every member once per round', () => {
    for (const seed of SEEDS) {
      for (let round = 0; round < 6; round++) {
        const picks = ids.map((_, i) => pickFair(seed, ids, round * ids.length + i)[0])
        expect([...picks].sort()).toEqual([...ids].sort())
      }
    }
  })

  it('picks different members for one turn, and stays even over time', () => {
    const counts = new Map<string, number>()
    for (let turn = 0; turn < 100; turn++) {
      const pair = pickFair(7, ids, turn, 2)
      expect(pair).toHaveLength(2)
      expect(pair[0]).not.toBe(pair[1])
      for (const id of pair) counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    const values = [...counts.values()]
    expect(values).toHaveLength(ids.length)
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(8)
  })

  it('copes with small and empty clubs', () => {
    expect(pickFair(1, [], 0)).toEqual([])
    expect(pickFair(1, ['a'], 5, 2)).toEqual(['a'])
  })
})

describe('onStage', () => {
  const e = (seq: number, over: Partial<EngineEvent>): EngineEvent => ({
    id: `e${seq}`,
    seq,
    kind: 'prosit',
    startedAt: 0,
    endsAt: 60_000,
    status: 'done',
    resolvedAt: 10_000,
    ...over,
  })

  it('shows a live event, then its result for a while, then nothing', () => {
    expect(onStage([e(1, { status: 'live', resolvedAt: null })], 'prosit', 5000)?.id).toBe('e1')
    expect(onStage([e(1, {})], 'prosit', 10_000 + RESULT_MS - 1)?.id).toBe('e1')
    expect(onStage([e(1, {})], 'prosit', 10_000 + RESULT_MS)).toBeUndefined()
  })

  it('takes the latest of its kind only', () => {
    const events = [e(3, { status: 'live', resolvedAt: null }), e(1, {}), e(2, { kind: 'regel', status: 'live' })]
    expect(onStage(events, 'prosit', 11_000)?.id).toBe('e3')
    expect(onStage(events, 'regel', 11_000)?.id).toBe('e2')
    expect(onStage(events, 'duell', 11_000)).toBeUndefined()
  })
})

describe('nextAction', () => {
  const T0 = 1_000_000
  const members = ['a', 'b', 'c']
  const base: EngineState = {
    night: { status: 'live', seed: 42, startedAt: T0, intervalMin: 12 },
    events: [],
    memberIds: members,
    responses: [],
  }
  const first = planEvent(42, 1, 12)
  const event = (over: Partial<EngineEvent>): EngineEvent => ({
    id: 'e1',
    seq: 1,
    kind: 'prosit',
    startedAt: T0,
    endsAt: T0 + PROSIT_MS,
    status: 'live',
    resolvedAt: null,
    ...over,
  })

  it('waits until the night is live and somebody has joined', () => {
    const late = T0 + 60 * 60_000
    expect(nextAction({ ...base, night: { ...base.night, status: 'idle' } }, late).type).toBe('wait')
    expect(nextAction({ ...base, night: { ...base.night, status: 'ended' } }, late).type).toBe('wait')
    expect(nextAction({ ...base, night: { ...base.night, seed: null } }, late).type).toBe('wait')
    expect(nextAction({ ...base, memberIds: [] }, late).type).toBe('wait')
  })

  it('spawns the first event when its wait is over, not before', () => {
    expect(nextAction(base, T0 + first.gapMs - 1)).toEqual({ type: 'wait' })
    const now = T0 + first.gapMs
    expect(nextAction(base, now)).toEqual({ type: 'spawn', plan: first, endsAt: now + first.durationMs })
  })

  it('spawns at once when forced', () => {
    expect(nextAction(base, T0 + 1, true)).toEqual({ type: 'spawn', plan: first, endsAt: T0 + 1 + first.durationMs })
  })

  it('follows a change of interval at once', () => {
    const now = T0 + planEvent(42, 1, 3).gapMs
    expect(nextAction(base, now).type).toBe('wait')
    expect(nextAction({ ...base, night: { ...base.night, intervalMin: 3 } }, now).type).toBe('spawn')
  })

  it('resolves a PROSIT! after its deadline, or as soon as everyone has answered', () => {
    const live = event({})
    const state = { ...base, events: [live] }
    expect(nextAction(state, live.endsAt + RESOLVE_GRACE_MS - 1).type).toBe('wait')
    expect(nextAction(state, live.endsAt + RESOLVE_GRACE_MS)).toEqual({ type: 'resolve', event: live })

    const two = ['a', 'b'].map((memberId) => ({ eventId: 'e1', memberId }))
    expect(nextAction({ ...state, responses: two }, T0 + 5).type).toBe('wait')
    const all = [...two, { eventId: 'e1', memberId: 'c' }]
    expect(nextAction({ ...state, responses: all }, T0 + 5)).toEqual({ type: 'resolve', event: live })
    // Answers to some other event do not count.
    const other = [...two, { eventId: 'e0', memberId: 'c' }]
    expect(nextAction({ ...state, responses: other }, T0 + 5).type).toBe('wait')
  })

  it('still resolves a leftover event after the night has ended', () => {
    const live = event({})
    const state: EngineState = { ...base, night: { ...base.night, status: 'ended' }, events: [live] }
    expect(nextAction(state, live.endsAt + RESOLVE_GRACE_MS).type).toBe('resolve')
  })

  it('never spawns while a blocking event is live, even when forced', () => {
    const state = { ...base, events: [event({})] }
    expect(nextAction(state, T0 + 30_000, true)).toEqual({ type: 'wait' })
  })

  it('spawns over a live Regel, and only resolves the Regel at its deadline', () => {
    const rule = event({ kind: 'regel', endsAt: T0 + REGEL_MS })
    const state = { ...base, events: [rule] }
    const forced = nextAction(state, T0 + 1000, true)
    expect(forced.type).toBe('spawn')
    if (forced.type === 'spawn') expect(forced.plan.seq).toBe(2)
    expect(nextAction(state, rule.endsAt + RESOLVE_GRACE_MS)).toEqual({ type: 'resolve', event: rule })
  })

  it('counts the wait from the previous event, and leaves room for its result', () => {
    const second = planEvent(42, 2, 12)
    const done = event({ status: 'done', resolvedAt: T0 + 20_000 })
    const state = { ...base, events: [done] }
    expect(nextAction(state, T0 + second.gapMs - 1).type).toBe('wait')
    expect(nextAction(state, T0 + second.gapMs).type).toBe('spawn')

    // Resolved late: the next one waits for the result to leave the screens.
    const late = event({ status: 'done', resolvedAt: T0 + second.gapMs })
    expect(nextAction({ ...base, events: [late] }, T0 + second.gapMs + RESULT_MS - 1).type).toBe('wait')
    expect(nextAction({ ...base, events: [late] }, T0 + second.gapMs + RESULT_MS).type).toBe('spawn')
  })
})
