// The TV's sounds as data: each cue is a list of notes, and src/tv/audio.ts turns the notes into
// Web Audio. Nothing here touches the browser, so the cues can be tested in Node.

/**
 * The instruments audio.ts can synthesize. `brass` and `tuba` are the band, `bell` is the big one
 * over the door, `drum` and `snare` keep time, `glass` is a spoon on a Maß and `knock` is the
 * chairman's gavel.
 */
export type Voice = 'brass' | 'tuba' | 'bell' | 'drum' | 'snare' | 'glass' | 'knock'

export interface Note {
  voice: Voice
  /** Hz. For `snare` and `knock` it is the colour of the noise, not a pitch. */
  freq: number
  /** Seconds from the start of the cue. */
  at: number
  /** Seconds the note is held. Bells and drums ring out over it. */
  dur: number
  /** 0 to 1, relative to the voice's own level. */
  vol: number
}

export type Cue = readonly Note[]

const SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

/** The frequency of a note name: `A4` is 440, `Bb3` and `C#5` work too. */
export function hz(name: string): number {
  const match = /^([A-G])([#b]?)(\d)$/.exec(name)
  if (!match) throw new Error(`not a note: ${name}`)
  const accidental = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0
  const midi = 12 * (Number(match[3]) + 1) + SEMITONES[match[1]] + accidental
  return 440 * 2 ** ((midi - 69) / 12)
}

function note(voice: Voice, pitch: string | number, at: number, dur: number, vol = 1): Note {
  return { voice, freq: typeof pitch === 'string' ? hz(pitch) : pitch, at, dur, vol }
}

function chord(voice: Voice, pitches: readonly string[], at: number, dur: number, vol = 1): Note[] {
  return pitches.map((p) => note(voice, p, at, dur, vol))
}

/** A roll on the snare that swells from `from` to `to`. */
function roll(from: number, to: number, vol: number): Note[] {
  const strokes = Math.round((to - from) / 0.06)
  return Array.from({ length: strokes }, (_, i) => note('snare', 2200, from + i * 0.06, 0.07, vol * (0.35 + (0.65 * i) / strokes)))
}

/**
 * PROSIT!: three strokes of the bell, then a waltz phrase after "Ein Prosit der Gemütlichkeit"
 * over tuba and drums, and the count to "g'suffa!" with a last chord.
 */
function prosit(): Note[] {
  const beat = 0.3
  const start = 0.9
  const tune: readonly (readonly [string, number])[] = [
    ['C4', 1], // Ein
    ['F4', 1], ['F4', 1], // Pro-sit
    ['F4', 1], // ein
    ['A4', 1], ['A4', 1], // Pro-sit
    ['A4', 1], // der
    ['C5', 1], ['C5', 1], ['Bb4', 1], // Ge-müt-lich
    ['A4', 3], // keit
  ]
  const notes = [0, 0.28, 0.56].map((at) => note('bell', 'A4', at, 1.2, 0.9))
  let at = start
  for (const [pitch, beats] of tune) {
    notes.push(note('brass', pitch, at, beats * beat * 0.92))
    at += beats * beat
  }
  // The band comes in on the first full bar, after the pickup.
  const bass = ['F2', 'C3', 'F2', 'F2']
  for (const [bar, pitch] of bass.entries()) {
    const one = start + beat + bar * 3 * beat
    notes.push(note('tuba', pitch, one, beat * 0.9), note('drum', 70, one, 0.25))
    for (const b of [1, 2]) notes.push(note('snare', 2600, one + b * beat, 0.08, 0.5), ...chord('brass', ['A3', 'C4'], one + b * beat, beat * 0.4, 0.35))
  }
  // Oans, zwoa, drei ...
  const count = start + 13 * beat + 0.15
  for (const i of [0, 1, 2]) notes.push(note('drum', 80, count + i * 0.33, 0.2), note('knock', 900, count + i * 0.33, 0.08))
  // ... g'suffa!
  const last = count + 3 * 0.33
  notes.push(...chord('brass', ['F3', 'A3', 'C4', 'F4', 'A4'], last, 0.85), note('tuba', 'F2', last, 0.85), note('drum', 60, last, 0.4), note('snare', 3000, last, 0.3))
  return notes
}

export const CUES = {
  prosit: prosit(),
  /** A new rule: the gavel three times, then two strokes of the deep bell. */
  regel: [
    ...[0, 0.24, 0.48].map((at) => note('knock', 700, at, 0.09)),
    note('bell', 'A3', 0.95, 2.4),
    note('bell', 'A3', 1.95, 2.6),
  ],
  /** A Duell is called: a roll, and a minor chord nobody mistakes for good news. */
  duell: [
    ...chord('brass', ['D3', 'A3'], 0, 0.45, 0.8),
    ...roll(0.1, 1.2, 0.7),
    ...chord('brass', ['D3', 'F3', 'A3', 'D4'], 1.2, 1),
    note('tuba', 'D2', 1.2, 1),
    note('drum', 60, 1.2, 0.5),
  ],
  /** "Dra!": a crack and a stab. Short, because the duellists are already moving. */
  draw: [note('snare', 1800, 0, 0.22), note('knock', 1400, 0, 0.1), ...chord('brass', ['A4', 'E5', 'A5'], 0, 0.3)],
  /** A vote: the herald's rising triad. */
  abstimmung: [
    note('brass', 'C4', 0, 0.14),
    note('brass', 'E4', 0.16, 0.14),
    note('brass', 'G4', 0.32, 0.14),
    ...chord('brass', ['C4', 'E4', 'G4', 'C5'], 0.48, 0.9),
    note('tuba', 'C3', 0.48, 0.9),
    note('snare', 2600, 0.48, 0.12, 0.6),
  ],
  /** An estimate question: a phrase that stops on the leading note and waits for an answer. */
  schatzfrage: [
    note('brass', 'G4', 0, 0.18),
    note('brass', 'G4', 0.2, 0.18),
    note('brass', 'E4', 0.4, 0.18),
    note('brass', 'A4', 0.6, 0.26),
    ...chord('brass', ['D4', 'G4', 'B4'], 0.9, 0.9),
    note('tuba', 'G2', 0.9, 0.9),
  ],
  /** A speech is called for: a spoon on the glass, then the band gives the speaker the floor. */
  trinkspruch: [
    ...[0, 0.24, 0.48].map((at) => note('glass', 2350, at, 0.5)),
    note('brass', 'F4', 0.95, 0.13),
    note('brass', 'A4', 1.1, 0.13),
    ...chord('brass', ['F4', 'A4', 'C5'], 1.25, 0.8),
    note('tuba', 'F2', 1.25, 0.8),
  ],
  /** The tribunal sits: three heavy blows of the gavel and a low, grave chord. */
  ehrengericht: [
    ...[0, 0.42, 0.84].map((at) => note('knock', 500, at, 0.12)),
    ...[0, 0.42, 0.84].map((at) => note('drum', 55, at, 0.2, 0.7)),
    ...chord('brass', ['C3', 'Eb3', 'G3'], 1.3, 1.3, 0.85),
    note('tuba', 'C2', 1.3, 1.3),
  ],
  /** A motion before the annual meeting: the bell calls the members in, the band seconds it. */
  stadgeandring: [
    note('bell', 'E4', 0, 1.4, 0.8),
    note('brass', 'E4', 0.6, 0.18),
    note('brass', 'A4', 0.8, 0.18),
    ...chord('brass', ['A3', 'C#4', 'E4', 'A4'], 1, 0.9),
    note('tuba', 'A2', 1, 0.9),
  ],
  /** A new leader in the points: a short herald call, sharp and a little indignant. */
  machtwechsel: [
    note('snare', 2800, 0, 0.1, 0.6),
    note('brass', 'D4', 0, 0.12),
    note('brass', 'G4', 0.14, 0.12),
    note('brass', 'B4', 0.28, 0.12),
    ...chord('brass', ['G3', 'D4', 'G4', 'D5'], 0.42, 0.7),
    note('tuba', 'G2', 0.42, 0.7),
    note('drum', 65, 0.42, 0.3),
  ],
  /** A result that costs nobody anything: the beer-hall Tusch, ta-daa. */
  tusch: [
    ...chord('brass', ['Bb3', 'D4', 'F4'], 0, 0.16),
    note('snare', 2800, 0, 0.1, 0.6),
    ...chord('brass', ['Bb3', 'D4', 'F4', 'Bb4'], 0.24, 1.1),
    note('tuba', 'Bb2', 0.24, 1.1),
    note('drum', 65, 0.24, 0.4),
    note('snare', 3200, 0.24, 0.5, 0.7),
  ],
  /** A Strafe: the gavel, and the trombone walks down the stairs. */
  strafe: [
    note('knock', 700, 0, 0.09),
    note('brass', 'D4', 0.1, 0.36),
    note('brass', 'Db4', 0.5, 0.36),
    note('brass', 'C4', 0.9, 0.36),
    note('brass', 'B3', 1.3, 1.1),
    note('tuba', 'B2', 1.3, 1.1, 0.8),
  ],
  /** One second gone, near the end of a PROSIT!. */
  tick: [note('knock', 1100, 0, 0.06, 0.8)],
  /** Before a name at the ceremony: the snare rolls up to a cymbal-like crack. Lasts as long as the drum roll on screen. */
  trommelwirbel: [...roll(0, 3.2, 0.9), note('drum', 70, 3.25, 0.4), note('snare', 3400, 3.25, 0.35)],
  /** The grand prize: a full fanfare in B flat, the herald and the whole band. */
  fanfare: [
    note('brass', 'F4', 0, 0.16),
    note('brass', 'F4', 0.18, 0.16),
    note('brass', 'F4', 0.36, 0.16),
    note('brass', 'Bb4', 0.54, 0.5),
    note('brass', 'A4', 1.1, 0.16),
    note('brass', 'Bb4', 1.28, 0.16),
    note('brass', 'C5', 1.46, 0.3),
    ...chord('brass', ['Bb3', 'D4', 'F4', 'Bb4', 'D5'], 1.82, 1.6),
    note('tuba', 'Bb2', 1.82, 1.6),
    note('drum', 60, 1.82, 0.5),
    ...roll(1.82, 3.2, 0.5),
    note('bell', 'Bb4', 1.82, 2, 0.6),
  ],
  /** An achievement: a little brass rise and a bright bell, not loud enough to stop a conversation. */
  medaille: [note('brass', 'C5', 0, 0.12, 0.7), note('brass', 'E5', 0.13, 0.12, 0.7), ...chord('brass', ['G4', 'C5', 'E5'], 0.26, 0.5, 0.7), note('bell', 'C6', 0.26, 1.2, 0.5)],
  /** The tap that unlocks the sound answers with a bell and two notes, so it is heard to work. */
  unlock: [note('bell', 'A4', 0, 1.2, 0.7), note('brass', 'C4', 0.05, 0.14), ...chord('brass', ['C4', 'G4'], 0.22, 0.5)],
} as const satisfies Record<string, Cue>

export type CueName = keyof typeof CUES

export const CUE_NAMES = Object.keys(CUES) as CueName[]

/** Seconds until the last note of a cue is released (bells and drums ring a little longer). */
export function cueLength(cue: Cue): number {
  return Math.max(...cue.map((n) => n.at + n.dur))
}
