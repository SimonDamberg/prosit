// Made-up members and events for the styleguide, so every stage can be looked at without a
// database or a running night. The ids are valid UUIDs because the stages still ask for answers.
import type { EventRow, MemberRow } from '../lib/types'
import { MEMBER_COLOURS } from '../shared/game/members'
import type { EventPayload, EventResult } from '../shared/game/types'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

export const MEMBERS: MemberRow[] = ['Jesper', 'Axel', 'Erik', 'Simon', 'Palm'].map((name, i) => ({
  id: id(i + 1),
  name,
  colour: MEMBER_COLOURS[i],
  createdAt: 0,
}))

const [jesper, axel, erik, simon, palm] = MEMBERS.map((m) => m.id)

interface Scene {
  payload: EventPayload
  /** How long the live event lasts in the preview. */
  seconds: number
  /** Present: the scene shows the result instead of the live event. */
  result?: EventResult
}

const DUELL: EventPayload = { kind: 'duell', a: axel, b: palm, drawAfterMs: 5000 }
const ABSTIMMUNG: EventPayload = { kind: 'abstimmung', question: 'Vem i klubben äger flest västar?', title: 'Westenkönig' }
const SCHATZFRAGE: EventPayload = { kind: 'schatzfrage', question: 'Hur många liter rymmer en Maß?', answer: 1, unit: 'liter' }
const TRINKSPRUCH: EventPayload = { kind: 'trinkspruch', speaker: erik, topic: 'Västens överlägsenhet över kavajen' }

export const SCENES = {
  'prosit-live': { payload: { kind: 'prosit' }, seconds: 14 },
  'prosit-strafe': { payload: { kind: 'prosit' }, seconds: 60, result: { kind: 'prosit', order: [simon, jesper, axel, erik], missed: [palm] } },
  'prosit-gut': { payload: { kind: 'prosit' }, seconds: 60, result: { kind: 'prosit', order: [simon], missed: [] } },
  'regel-live': { payload: { kind: 'regel', rule: 'Ingen nämner arbetet. Wir sind hier zum Trinken.' }, seconds: 600 },
  'duell-live': { payload: DUELL, seconds: 12 },
  'duell-result': {
    payload: DUELL,
    seconds: 45,
    result: { kind: 'duell', winner: palm, loser: axel, reactions: { [palm]: 287, [axel]: 412 }, falseStarts: [] },
  },
  'abstimmung-live': { payload: ABSTIMMUNG, seconds: 60 },
  'abstimmung-result': {
    payload: ABSTIMMUNG,
    seconds: 60,
    result: { kind: 'abstimmung', winners: [jesper], votes: { [jesper]: 3, [simon]: 2 } },
  },
  'schatzfrage-live': { payload: SCHATZFRAGE, seconds: 75 },
  'schatzfrage-result': {
    payload: SCHATZFRAGE,
    seconds: 75,
    result: { kind: 'schatzfrage', closest: erik, furthest: axel, guesses: { [erik]: 1, [simon]: 1.2, [jesper]: 0.5, [axel]: 3 } },
  },
  'trinkspruch-live': { payload: TRINKSPRUCH, seconds: 90 },
  'trinkspruch-gut': {
    payload: TRINKSPRUCH,
    seconds: 90,
    result: { kind: 'trinkspruch', average: 4.3, ratings: { [jesper]: 5, [axel]: 4, [simon]: 4 } },
  },
  'trinkspruch-strafe': {
    payload: TRINKSPRUCH,
    seconds: 90,
    result: { kind: 'trinkspruch', average: 1.5, ratings: { [jesper]: 1, [axel]: 2 } },
  },
} as const satisfies Record<string, Scene>

export type SceneName = keyof typeof SCENES

export const SCENE_NAMES = Object.keys(SCENES) as SceneName[]

/** The event of a scene, as if it started (or was resolved) at `at`, in server time. */
export function sceneEvent(name: SceneName, at: number): EventRow {
  const scene: Scene = SCENES[name]
  const base = { id: id(100 + SCENE_NAMES.indexOf(name)), seq: 1, kind: scene.payload.kind, payload: scene.payload }
  if (!scene.result) return { ...base, startedAt: at, endsAt: at + scene.seconds * 1000, status: 'live', result: null, resolvedAt: null }
  return { ...base, startedAt: at - scene.seconds * 1000, endsAt: at, status: 'done', result: scene.result, resolvedAt: at }
}
