// The TV's sound, synthesized with Web Audio (no files). A browser only lets a page make noise
// after a tap, so the TV asks for one ("Starta kvällen") and is silent until then.
//
// These are plain placeholder sounds: Stage 5 replaces them with the brass sting and the bell.

let ctx: AudioContext | null = null
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
    ctx ??= new AudioContext()
    ctx.onstatechange = () => listeners.forEach((l) => l())
    await ctx.resume()
  } catch {
    // No sound, then. The screens still work.
  }
  listeners.forEach((l) => l())
}

function note(freq: number, at: number, seconds: number, type: OscillatorType, volume: number) {
  if (!ctx || ctx.state !== 'running') return
  const start = ctx.currentTime + at
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(volume, start)
  gain.gain.exponentialRampToValueAtTime(0.001, start + seconds)
  osc.connect(gain).connect(ctx.destination)
  osc.start(start)
  osc.stop(start + seconds)
}

/** PROSIT!: a two-tone klaxon nobody can talk over. */
export function playAlarm() {
  for (let i = 0; i < 8; i++) note(i % 2 === 0 ? 587 : 440, i * 0.3, 0.28, 'square', 0.25)
}

/** A new rule: two strokes of a bell. */
export function playBell() {
  for (const at of [0, 0.7]) {
    note(880, at, 1.6, 'sine', 0.4)
    note(1760, at, 0.9, 'sine', 0.15)
  }
}

/** Duell, Abstimmung, Schätzfrage, Trinkspruch: a rising call to attention. */
export function playCall() {
  for (const [i, freq] of [392, 523, 659, 784].entries()) note(freq, i * 0.16, i === 3 ? 0.7 : 0.18, 'sawtooth', 0.2)
}

/** The draw in a Duell: one sharp crack. */
export function playDraw() {
  note(1320, 0, 0.35, 'square', 0.3)
  note(660, 0, 0.5, 'square', 0.2)
}
