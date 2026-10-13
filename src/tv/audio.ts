// The TV's sound, synthesized with Web Audio (no files). A browser only lets a page make noise
// after a tap, so the TV asks for one ("Starta kvällen") and is silent until then.
//
// What is played lives in score.ts, as notes. This file is the band: one small synth per voice.
import { CUES, cueLength, type Cue, type CueName, type Note } from './score'

/** The one volume knob. The compressor after it keeps a full chord from clipping. */
const MASTER_VOLUME = 0.9

let ctx: AudioContext | null = null
let master: AudioNode | null = null
const listeners = new Set<() => void>()

export const audioStore = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  /** True once sound can play. Also true where there is no Web Audio at all: nothing to unlock. */
  isUnlocked: () => typeof AudioContext === 'undefined' || ctx?.state === 'running',
}

/** Call from a tap. */
export async function unlockAudio(): Promise<void> {
  try {
    if (!ctx) {
      ctx = new AudioContext()
      master = createMaster(ctx)
    }
    ctx.onstatechange = () => listeners.forEach((l) => l())
    await ctx.resume()
  } catch {
    // No sound, then. The screens still work.
  }
  listeners.forEach((l) => l())
}

/** Plays a cue from score.ts. Silent until the TV has been unlocked. */
export function play(name: CueName) {
  if (!ctx || !master || ctx.state !== 'running') return
  schedule(ctx, master, CUES[name], ctx.currentTime + 0.02)
}

/**
 * Renders a cue without playing it and reports how loud it came out. For the styleguide: a peak
 * of 1 or more would clip on the TV.
 */
export async function measureCue(name: CueName): Promise<{ peak: number; rms: number }> {
  const rate = 44_100
  const offline = new OfflineAudioContext(1, Math.ceil((cueLength(CUES[name]) + 3) * rate), rate)
  schedule(offline, createMaster(offline), CUES[name], 0.02)
  const samples = (await offline.startRendering()).getChannelData(0)
  let peak = 0
  let squares = 0
  for (const s of samples) {
    peak = Math.max(peak, Math.abs(s))
    squares += s * s
  }
  return { peak, rms: Math.sqrt(squares / samples.length) }
}

function createMaster(ac: BaseAudioContext): AudioNode {
  const gain = ac.createGain()
  gain.gain.value = MASTER_VOLUME
  const squeeze = ac.createDynamicsCompressor()
  squeeze.threshold.value = -16
  squeeze.knee.value = 10
  squeeze.ratio.value = 12
  squeeze.attack.value = 0.002
  squeeze.release.value = 0.2
  gain.connect(squeeze).connect(ac.destination)
  return gain
}

function schedule(ac: BaseAudioContext, out: AudioNode, cue: Cue, at: number) {
  for (const n of cue) VOICES[n.voice](ac, out, n, at + n.at)
}

type Synth = (ac: BaseAudioContext, out: AudioNode, n: Note, t: number) => void

/**
 * A horn: two sawtooths a few cents apart through a lowpass that opens with the attack. That
 * sweep, dull to bright in a few hundredths of a second, is what makes a sawtooth read as brass.
 */
function horn(level: number, bright: number, attack: number): Synth {
  return (ac, out, n, t) => {
    const release = 0.09
    const rise = Math.min(attack, n.dur / 2)
    const end = t + n.dur

    const filter = ac.createBiquadFilter()
    filter.type = 'lowpass'
    filter.Q.value = 1.2
    filter.frequency.setValueAtTime(n.freq * 1.2, t)
    filter.frequency.linearRampToValueAtTime(Math.min(n.freq * bright, 7000), t + rise * 2)
    filter.frequency.linearRampToValueAtTime(Math.min(n.freq * bright * 0.6, 7000), end)

    const gain = ac.createGain()
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(level * n.vol, t + rise)
    gain.gain.linearRampToValueAtTime(level * n.vol * 0.75, end)
    gain.gain.linearRampToValueAtTime(0, end + release)

    for (const cents of [-7, 7]) {
      const osc = ac.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = n.freq
      osc.detune.value = cents
      osc.connect(filter)
      osc.start(t)
      osc.stop(end + release + 0.02)
    }
    filter.connect(gain).connect(out)
  }
}

/** One decaying sine. The building block of everything that is struck. */
function ping(ac: BaseAudioContext, out: AudioNode, freq: number, t: number, seconds: number, level: number) {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(level, t + 0.004)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds)
  osc.connect(gain).connect(out)
  osc.start(t)
  osc.stop(t + seconds + 0.02)
}

/** The partials of a struck bell (after Risset): pitch ratio, loudness, and share of the ring. */
const BELL: readonly (readonly [number, number, number])[] = [
  [0.56, 1, 1],
  [0.92, 0.67, 0.9],
  [1.19, 1, 0.65],
  [1.71, 1.8, 0.55],
  [2, 2.67, 0.33],
  [2.74, 1.67, 0.35],
  [3, 1.46, 0.25],
  [4.07, 1.33, 0.2],
]

const bell: Synth = (ac, out, n, t) => {
  for (const [ratio, loud, share] of BELL) ping(ac, out, n.freq * ratio, t, n.dur * 1.6 * share, 0.05 * loud * n.vol)
}

const glass: Synth = (ac, out, n, t) => {
  ping(ac, out, n.freq, t, n.dur, 0.22 * n.vol)
  ping(ac, out, n.freq * 2.76, t, n.dur * 0.5, 0.1 * n.vol)
}

/** A bass drum: a sine that drops onto its pitch. */
const drum: Synth = (ac, out, n, t) => {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.frequency.setValueAtTime(n.freq * 2.8, t)
  osc.frequency.exponentialRampToValueAtTime(n.freq, t + 0.07)
  gain.gain.setValueAtTime(0.9 * n.vol, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + n.dur)
  osc.connect(gain).connect(out)
  osc.start(t)
  osc.stop(t + n.dur + 0.02)
}

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>()

function noise(ac: BaseAudioContext): AudioBufferSourceNode {
  let buffer = noiseBuffers.get(ac)
  if (!buffer) {
    buffer = ac.createBuffer(1, ac.sampleRate, ac.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    noiseBuffers.set(ac, buffer)
  }
  const source = ac.createBufferSource()
  source.buffer = buffer
  return source
}

/** Filtered noise that dies away: a snare (highpass) or a gavel on wood (bandpass, with a thump). */
function hit(type: BiquadFilterType, level: number, thump: boolean): Synth {
  return (ac, out, n, t) => {
    const source = noise(ac)
    const filter = ac.createBiquadFilter()
    filter.type = type
    filter.frequency.value = n.freq
    filter.Q.value = type === 'bandpass' ? 3 : 0.7
    const gain = ac.createGain()
    gain.gain.setValueAtTime(level * n.vol, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + n.dur)
    source.connect(filter).connect(gain).connect(out)
    source.start(t)
    source.stop(t + n.dur + 0.02)
    if (thump) ping(ac, out, n.freq / 4, t, n.dur, 0.5 * n.vol)
  }
}

const VOICES: Record<Note['voice'], Synth> = {
  brass: horn(0.13, 6, 0.035),
  tuba: horn(0.2, 4, 0.025),
  bell,
  glass,
  drum,
  snare: hit('highpass', 0.35, false),
  knock: hit('bandpass', 1.2, true),
}
