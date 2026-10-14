// Made-up members and events for the styleguide, so every stage can be looked at without a
// database or a running night. The ids are valid UUIDs because the stages still ask for answers.
import type { DrinkRow, EventRow, MemberRow, NightRow, PointsRow, StrafeRow } from '../lib/types'
import type { Achievement } from '../shared/game/achievements'
import { computeAwards, FINALE_AWARD_MS, FINALE_INTRO_MS, FINALE_REVEAL_MS, finaleLength } from '../shared/game/awards'
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
const EHRENGERICHT: EventPayload = { kind: 'ehrengericht', accused: simon, charge: 'beställt havremjölk i kaffet' }
const STADGEANDRING: EventPayload = { kind: 'stadgeandring', amendment: 'Brezeln upphöjs till klubbens officiella valuta.' }

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
  'ehrengericht-live': { payload: EHRENGERICHT, seconds: 75 },
  'ehrengericht-skyldig': {
    payload: EHRENGERICHT,
    seconds: 75,
    result: { kind: 'ehrengericht', guilty: true, votes: { skyldig: 3, frikand: 1 } },
  },
  'ehrengericht-frikand': {
    payload: EHRENGERICHT,
    seconds: 75,
    result: { kind: 'ehrengericht', guilty: false, votes: { skyldig: 2, frikand: 2 } },
  },
  'stadgeandring-live': { payload: STADGEANDRING, seconds: 60 },
  'stadgeandring-antagen': {
    payload: STADGEANDRING,
    seconds: 60,
    result: { kind: 'stadgeandring', passed: true, ja: 4, nej: 1 },
  },
  'stadgeandring-avslagen': {
    payload: STADGEANDRING,
    seconds: 60,
    result: { kind: 'stadgeandring', passed: false, ja: 2, nej: 2 },
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

// The finale: a short night's log for the five, so the ceremony has something to read out.

const row = (n: number) => ({ id: id(500 + n), at: 0 })
const DRINKS: DrinkRow[] = (
  [
    [jesper, 'mass'], [jesper, 'mass'], [jesper, 'ol'],
    [axel, 'ol'], [axel, 'schnaps'], [axel, 'schnaps'], [axel, 'schnaps'],
    [erik, 'ol'], [erik, 'wasser'], [erik, 'wasser'],
    [simon, 'mass'], [simon, 'ol'], [simon, 'ol'],
    [palm, 'ol'],
  ] as const
).map(([memberId, kind], i) => ({ ...row(i), memberId, kind }))

const STRAFEN: StrafeRow[] = [
  { ...row(20), memberId: axel, givenBy: simon, reason: 'Nämnde arbetet', eventId: null },
  { ...row(21), memberId: axel, givenBy: simon, reason: 'Havremjölk', eventId: null },
  { ...row(22), memberId: palm, givenBy: null, reason: 'Sist i skålen', eventId: null },
]

const POINTS: PointsRow[] = [
  { ...row(30), memberId: simon, amount: 3, reason: 'Först i skålen', eventId: null },
  { ...row(31), memberId: erik, amount: 4, reason: 'Trinkspruch', eventId: null },
  { ...row(32), memberId: simon, amount: 3, reason: 'Duell', eventId: null },
]

/** Finale scenes: how long after the end of the night each one is looked at. */
export const FINALE_SCENES = {
  'finale-intro': 0,
  'finale-drumroll': FINALE_INTRO_MS + 1000,
  'finale-award': FINALE_INTRO_MS + FINALE_REVEAL_MS + 500,
  'finale-grand': 0,
  'finale-standings': 0,
} as const
export type FinaleSceneName = keyof typeof FINALE_SCENES
export const FINALE_SCENE_NAMES = Object.keys(FINALE_SCENES) as FinaleSceneName[]

/** The log of the finale fixture and when the night ended, for a scene looked at `at`. */
export function finaleFixture(name: FinaleSceneName, at: number) {
  const events = SCENE_NAMES.filter((s) => 'result' in SCENES[s]).map((s) => sceneEvent(s, 0))
  const log = { drinks: DRINKS, strafen: STRAFEN, points: POINTS, events }
  const count = computeAwards({ ...log, memberIds: MEMBERS.map((m) => m.id) }).length
  const offset =
    name === 'finale-grand'
      ? FINALE_INTRO_MS + (count - 1) * FINALE_AWARD_MS + FINALE_REVEAL_MS + 500
      : name === 'finale-standings'
        ? finaleLength(count) + 500
        : FINALE_SCENES[name]
  const night: NightRow = { status: 'ended', seed: 1, startedAt: 0, intervalMin: 12, endedAt: at - offset }
  return { ...log, night }
}

/** Achievements to pop up one after the other. */
export const ACHIEVEMENT_FIXTURE: Achievement[] = [
  { id: `anstich:${jesper}`, key: 'anstich', memberId: jesper, at: 1 },
  { id: `wasser:${erik}`, key: 'wasser', memberId: erik, at: 2 },
  { id: `hattrick:${axel}`, key: 'hattrick', memberId: axel, at: 3 },
]
