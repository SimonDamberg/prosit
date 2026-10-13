import { describe, expect, it } from 'vitest'
import { AWARD_REASONS } from '../content/events'
import { QUESTIONS } from '../content/questions'
import { RULES, ruleBreach } from '../content/rules'
import { TOAST_TOPICS } from '../content/toasts'
import { VOTES } from '../content/votes'
import { MAX_REASON_LENGTH } from './members'
import {
  ABSTIMMUNG_MS,
  COMPANY_KINDS,
  DRAW_MAX,
  DRAW_MIN,
  DUELL_MS,
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
  responders,
  RESULT_MS,
  SCHATZFRAGE_MS,
  stageEvent,
  TRINKSPRUCH_MS,
  trinkspruchPhases,
  type EngineEvent,
  type EngineState,
} from './schedule'
import { EVENT_KINDS, type EventKind, type EventPayload } from './types'

const SEEDS = [0, 1, 42, 1887, 123456789, 2147483646]
const IDS = ['a', 'b', 'c', 'd', 'e']
const LASTS: Record<EventKind, number> = {
  prosit: PROSIT_MS,
  regel: REGEL_MS,
  duell: DUELL_MS,
  abstimmung: ABSTIMMUNG_MS,
  schatzfrage: SCHATZFRAGE_MS,
  trinkspruch: TRINKSPRUCH_MS,
}

/** The payloads of the first `count` events of `kind` in a night. */
function payloadsOf<K extends EventKind>(seed: number, kind: K, count: number, ids = IDS) {
  const out: Extract<EventPayload, { kind: K }>[] = []
  for (let seq = 1; out.length < count; seq++) {
    const { payload } = planEvent(seed, seq, 12, ids)
    if (payload.kind === kind) out.push(payload as Extract<EventPayload, { kind: K }>)
  }
  return out
}

describe('planEvent', () => {
  it('gives the same plan for the same inputs, and survives a JSON round trip', () => {
    for (const seed of SEEDS) {
      for (let seq = 1; seq <= 30; seq++) {
        const plan = planEvent(seed, seq, 12, IDS)
        expect(planEvent(seed, seq, 12, IDS)).toEqual(plan)
        expect(JSON.parse(JSON.stringify(plan))).toEqual(plan)
        expect(plan.seq).toBe(seq)
        expect(plan.payload.kind).toBe(plan.kind)
        expect(ENABLED_KINDS).toContain(plan.kind)
      }
    }
  })

  it('differs between seeds', () => {
    const line = (seed: number) => Array.from({ length: 20 }, (_, i) => planEvent(seed, i + 1, 12, IDS).gapMs)
    expect(line(1)).not.toEqual(line(2))
  })

  it('never draws the same kind twice in a row', () => {
    for (const seed of SEEDS) {
      let prev = ''
      for (let seq = 1; seq <= 200; seq++) {
        const { kind } = planEvent(seed, seq, 12, IDS)
        expect(kind).not.toBe(prev)
        prev = kind
      }
    }
  })

  it('keeps the wait within 8 to 15 minutes at the default interval', () => {
    for (const seed of SEEDS) {
      for (let seq = 1; seq <= 100; seq++) {
        const { gapMs } = planEvent(seed, seq, 12, IDS)
        expect(gapMs).toBeGreaterThanOrEqual(12 * 60_000 * GAP_MIN)
        expect(gapMs).toBeLessThanOrEqual(12 * 60_000 * GAP_MAX)
      }
    }
  })

  it('scales the wait with the interval but keeps kind and payload', () => {
    const a = planEvent(42, 7, 12, IDS)
    const b = planEvent(42, 7, 6, IDS)
    expect(b.kind).toBe(a.kind)
    expect(b.payload).toEqual(a.payload)
    expect(Math.abs(b.gapMs - a.gapMs / 2)).toBeLessThanOrEqual(1)
  })

  it('caps how long an event lasts at one interval', () => {
    for (let seq = 1; seq <= 10; seq++) {
      const long = planEvent(42, seq, 12, IDS)
      expect(long.durationMs).toBe(LASTS[long.kind])
      expect(planEvent(42, seq, 0.5, IDS).durationMs).toBe(30_000)
    }
  })

  it('draws every kind, each about as often as the others', () => {
    const counts = new Map<string, number>()
    for (let seq = 1; seq <= 300; seq++) {
      const { kind } = planEvent(1887, seq, 12, IDS)
      counts.set(kind, (counts.get(kind) ?? 0) + 1)
    }
    expect([...counts.keys()].sort()).toEqual([...EVENT_KINDS].sort())
    for (const n of counts.values()) expect(n).toBeGreaterThan(25)
  })

  it('uses every rule, vote, question and topic once before any comes back', () => {
    for (const seed of SEEDS.slice(0, 3)) {
      const check = (texts: string[], pool: readonly string[]) => {
        const first = texts.slice(0, pool.length)
        expect([...first].sort()).toEqual([...pool].sort())
        expect(texts.slice(pool.length)).toEqual(first)
      }
      check(payloadsOf(seed, 'regel', RULES.length * 2).map((p) => p.rule), RULES)
      check(payloadsOf(seed, 'abstimmung', VOTES.length * 2).map((p) => p.question), VOTES.map((v) => v.question))
      check(payloadsOf(seed, 'schatzfrage', QUESTIONS.length * 2).map((p) => p.question), QUESTIONS.map((q) => q.question))
      check(payloadsOf(seed, 'trinkspruch', TOAST_TOPICS.length * 2).map((p) => p.topic), TOAST_TOPICS)
    }
  })

  it('copies the whole vote and question into the payload', () => {
    const [vote] = payloadsOf(42, 'abstimmung', 1)
    expect(VOTES).toContainEqual({ question: vote.question, title: vote.title })
    const [q] = payloadsOf(42, 'schatzfrage', 1)
    expect(QUESTIONS).toContainEqual({ question: q.question, answer: q.answer, unit: q.unit })
  })

  it('sends two different members to a Duell, everyone about as often, and draws late in it', () => {
    for (const seed of SEEDS) {
      const counts = new Map<string, number>()
      for (const p of payloadsOf(seed, 'duell', 20)) {
        expect(p.a).not.toBe(p.b)
        expect(IDS).toContain(p.a)
        expect(IDS).toContain(p.b)
        expect(p.drawAfterMs).toBeGreaterThanOrEqual(DUELL_MS * DRAW_MIN)
        expect(p.drawAfterMs).toBeLessThanOrEqual(DUELL_MS * DRAW_MAX)
        for (const id of [p.a, p.b]) counts.set(id, (counts.get(id) ?? 0) + 1)
      }
      // 40 seats over five members: eight each, give or take a pair that straddles two rounds.
      const values = [...counts.values()]
      expect(values).toHaveLength(IDS.length)
      expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(3)
    }
  })

  it('keeps the draw inside a Duell that a short interval cut down', () => {
    const [seq] = Array.from({ length: 50 }, (_, i) => i + 1).filter((n) => planEvent(42, n, 0.5, IDS).kind === 'duell')
    const plan = planEvent(42, seq, 0.5, IDS)
    expect(plan.durationMs).toBe(30_000)
    expect(plan.payload.kind === 'duell' && plan.payload.drawAfterMs < plan.durationMs).toBe(true)
  })

  it('lets every member speak once before anyone speaks again', () => {
    for (const seed of SEEDS) {
      const speakers = payloadsOf(seed, 'trinkspruch', IDS.length * 2).map((p) => p.speaker)
      expect([...speakers.slice(0, IDS.length)].sort()).toEqual(IDS)
      expect([...speakers.slice(IDS.length)].sort()).toEqual(IDS)
    }
  })

  it('gives the same plan whatever the order of the member list', () => {
    for (let seq = 1; seq <= 30; seq++) {
      expect(planEvent(7, seq, 12, [...IDS].reverse())).toEqual(planEvent(7, seq, 12, IDS))
    }
  })

  it('never draws a kind that needs company for a club of one', () => {
    for (const ids of [[], ['a']]) {
      for (let seq = 1; seq <= 60; seq++) {
        expect(COMPANY_KINDS).not.toContain(planEvent(42, seq, 12, ids).kind)
      }
    }
  })

  it('plans the forced kind, unless the club is too small for it', () => {
    for (const kind of EVENT_KINDS) {
      const plan = planEvent(42, 3, 12, IDS, kind)
      expect(plan.kind).toBe(kind)
      expect(plan.payload.kind).toBe(kind)
      expect(plan.durationMs).toBe(LASTS[kind])
    }
    expect(planEvent(42, 3, 12, ['a'], 'duell').kind).toBe(planEvent(42, 3, 12, ['a']).kind)
    expect(planEvent(42, 3, 12, ['a'], 'schatzfrage').kind).toBe('schatzfrage')
  })
})

describe('content pools', () => {
  it('have no duplicates', () => {
    expect(new Set(VOTES.map((v) => v.question)).size).toBe(VOTES.length)
    expect(new Set(VOTES.map((v) => v.title)).size).toBe(VOTES.length)
    expect(new Set(QUESTIONS.map((q) => q.question)).size).toBe(QUESTIONS.length)
    expect(new Set(TOAST_TOPICS).size).toBe(TOAST_TOPICS.length)
  })

  it('ask questions with a plain number for an answer', () => {
    for (const q of QUESTIONS) expect(Number.isFinite(q.answer)).toBe(true)
  })

  it('keep every award reason within a Strafe reason', () => {
    for (const reason of Object.values(AWARD_REASONS)) expect([...reason].length).toBeLessThanOrEqual(MAX_REASON_LENGTH)
  })
})

describe('responders', () => {
  it('names who must answer before an event closes early', () => {
    expect(responders({ kind: 'prosit' }, IDS)).toEqual(IDS)
    expect(responders({ kind: 'abstimmung', question: '?', title: 'T' }, IDS)).toEqual(IDS)
    expect(responders({ kind: 'schatzfrage', question: '?', answer: 1, unit: 'st' }, IDS)).toEqual(IDS)
    expect(responders({ kind: 'duell', a: 'b', b: 'd', drawAfterMs: 1 }, IDS)).toEqual(['b', 'd'])
    expect(responders({ kind: 'trinkspruch', speaker: 'c', topic: 'T' }, IDS)).toEqual(['a', 'b', 'd', 'e'])
    expect(responders({ kind: 'regel', rule: 'R' }, IDS)).toBeNull()
  })
})

describe('trinkspruchPhases', () => {
  it('splits the event into getting up, the speech and the rating', () => {
    expect(trinkspruchPhases(1000, 1000 + TRINKSPRUCH_MS)).toEqual({ speechFrom: 16_000, speechTo: 46_000 })
    expect(trinkspruchPhases(0, 30_000)).toEqual({ speechFrom: 5000, speechTo: 15_000 })
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
    payload: { kind: 'prosit' },
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

  it('stageEvent finds the blocking event whatever its kind, and never a Regel', () => {
    const duell = e(2, { kind: 'duell', status: 'live', resolvedAt: null })
    const rule = e(3, { kind: 'regel', status: 'live', resolvedAt: null })
    expect(stageEvent([e(1, {}), duell, rule], 11_000)?.id).toBe('e2')
    expect(stageEvent([rule], 11_000)).toBeUndefined()
    expect(stageEvent([e(1, {})], 10_000 + RESULT_MS - 1)?.id).toBe('e1')
    expect(stageEvent([e(1, {})], 10_000 + RESULT_MS)).toBeUndefined()
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
  const first = planEvent(42, 1, 12, members)
  const event = (over: Partial<EngineEvent>): EngineEvent => ({
    id: 'e1',
    seq: 1,
    kind: 'prosit',
    payload: { kind: 'prosit' },
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
    const now = T0 + planEvent(42, 1, 3, members).gapMs
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
    const rule = event({ kind: 'regel', payload: { kind: 'regel', rule: 'R' }, endsAt: T0 + REGEL_MS })
    const state = { ...base, events: [rule] }
    const forced = nextAction(state, T0 + 1000, true)
    expect(forced.type).toBe('spawn')
    if (forced.type === 'spawn') expect(forced.plan.seq).toBe(2)
    expect(nextAction(state, rule.endsAt + RESOLVE_GRACE_MS)).toEqual({ type: 'resolve', event: rule })
  })

  it('counts the wait from the previous event, and leaves room for its result', () => {
    const second = planEvent(42, 2, 12, members)
    const done = event({ status: 'done', resolvedAt: T0 + 20_000 })
    const state = { ...base, events: [done] }
    expect(nextAction(state, T0 + second.gapMs - 1).type).toBe('wait')
    expect(nextAction(state, T0 + second.gapMs).type).toBe('spawn')

    // Resolved late: the next one waits for the result to leave the screens.
    const late = event({ status: 'done', resolvedAt: T0 + second.gapMs })
    expect(nextAction({ ...base, events: [late] }, T0 + second.gapMs + RESULT_MS - 1).type).toBe('wait')
    expect(nextAction({ ...base, events: [late] }, T0 + second.gapMs + RESULT_MS).type).toBe('spawn')
  })

  it('closes a Duell once both duellists have tapped, whatever the bystanders do', () => {
    const duell = event({ kind: 'duell', payload: { kind: 'duell', a: 'a', b: 'c', drawAfterMs: 30_000 }, endsAt: T0 + DUELL_MS })
    const state = { ...base, events: [duell] }
    const by = (...ids: string[]) => ids.map((memberId) => ({ eventId: 'e1', memberId }))
    expect(nextAction({ ...state, responses: by('a', 'b') }, T0 + 5).type).toBe('wait')
    expect(nextAction({ ...state, responses: by('a', 'c') }, T0 + 5)).toEqual({ type: 'resolve', event: duell })
  })

  it('closes a Trinkspruch once everyone but the speaker has rated it', () => {
    const toast = event({ kind: 'trinkspruch', payload: { kind: 'trinkspruch', speaker: 'b', topic: 'T' }, endsAt: T0 + TRINKSPRUCH_MS })
    const state = { ...base, events: [toast] }
    const by = (...ids: string[]) => ids.map((memberId) => ({ eventId: 'e1', memberId }))
    expect(nextAction({ ...state, responses: by('a') }, T0 + 5).type).toBe('wait')
    expect(nextAction({ ...state, responses: by('a', 'c') }, T0 + 5)).toEqual({ type: 'resolve', event: toast })
  })

  it('spawns the kind the dev trigger names', () => {
    const forced = nextAction(base, T0 + 1, 'schatzfrage')
    expect(forced.type === 'spawn' && forced.plan.kind).toBe('schatzfrage')
  })
})
