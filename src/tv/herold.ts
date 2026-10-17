// Der Herold: the TV reads verdicts, Strafen and honours aloud with the browser's speech
// synthesis, in a German voice: Swedish lines with a German accent, that is the joke. A Swedish
// voice is the fallback. Never the browser's default voice, which is usually English. Synthesized like every other TV sound (no files), TV only, and
// silent where the browser has no voices. Off with VITE_HEROLD=off.
import type { MemberRow } from '../lib/types'
import { HEROLD } from '../shared/content/tv'
import { fmtNumber } from '../shared/game/format'
import type { EventPayload, EventResult } from '../shared/game/types'
import { setHeroldBusy } from './music'

const ENABLED = (import.meta.env.VITE_HEROLD as string | undefined) !== 'off' && typeof speechSynthesis !== 'undefined'

/** Slower than normal speech: a herald proclaims, he does not chat. */
const RATE = 0.92
const PITCH = 0.85

let primed = false

/** The best German voice the browser has, else a Swedish one, else none. Voices load late in Chrome. */
function heroldVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices()
  const lang = (v: SpeechSynthesisVoice) => v.lang.replace('_', '-').toLowerCase()
  return (
    // Reed, then Anna (the Mac voices the club chose), then whatever German the browser has.
    voices.find((v) => lang(v) === 'de-de' && /^reed\b/i.test(v.name)) ??
    voices.find((v) => lang(v) === 'de-de' && /^anna\b/i.test(v.name)) ??
    voices.find((v) => lang(v) === 'de-de' && /google|markus|yannick/i.test(v.name)) ??
    voices.find((v) => lang(v).startsWith('de')) ??
    voices.find((v) => lang(v) === 'sv-se' && /google|alva|klara|oskar|sofie|mattias/i.test(v.name)) ??
    voices.find((v) => lang(v).startsWith('sv')) ??
    null
  )
}

/** For the styleguide: the voice the Herold would use now, or null when he stays silent. */
export const heroldVoiceName = () => (ENABLED ? (heroldVoice()?.name ?? null) : null)

/** For the styleguide: every voice the browser offers, as "name (lang)". */
export const heroldVoices = () => (typeof speechSynthesis === 'undefined' ? [] : speechSynthesis.getVoices().map((v) => `${v.name} (${v.lang})`))

/** Call from the unlock tap: some browsers only let a page speak after one. */
export function primeHerold() {
  if (!ENABLED || primed) return
  primed = true
  speechSynthesis.getVoices()
  speechSynthesis.speak(new SpeechSynthesisUtterance(''))
}

/** Reads `text` aloud after `delayMs` (so it does not talk over a cue), behind anything already queued. */
export function say(text: string, delayMs = 0) {
  if (!ENABLED || !primed || !text) return
  setTimeout(() => {
    // No German or Swedish voice: stay silent rather than read Swedish in English.
    const voice = heroldVoice()
    if (!voice) return
    const line = new SpeechSynthesisUtterance(text)
    line.voice = voice
    line.lang = voice.lang
    line.rate = RATE
    line.pitch = PITCH
    line.onstart = () => setHeroldBusy(true)
    line.onend = line.onerror = () => {
      if (!speechSynthesis.speaking && !speechSynthesis.pending) setHeroldBusy(false)
    }
    speechSynthesis.speak(line)
  }, delayMs)
}

/** What the Herold says when an event's result is in. Empty for a result with nothing to say. */
export function verdictLine(payload: EventPayload, result: EventResult, members: readonly MemberRow[]): string {
  const name = (id: string | null) => (id === null ? null : (members.find((m) => m.id === id)?.name ?? null))
  const names = (ids: readonly string[]) => ids.flatMap((id) => name(id) ?? []).join(', ')
  if (payload.kind === 'abstimmung' && result.kind === 'abstimmung') return HEROLD.abstimmung(payload.title, names(result.winners))
  if (payload.kind === 'trinkspruch' && result.kind === 'trinkspruch') {
    return HEROLD.trinkspruch(name(payload.speaker) ?? '?', result.average === null ? null : fmtNumber(result.average))
  }
  if (payload.kind === 'ehrengericht' && result.kind === 'ehrengericht') return HEROLD.ehrengericht(name(payload.accused) ?? '?', result.guilty)
  switch (result.kind) {
    case 'prosit':
      return HEROLD.prosit(name(result.order[0] ?? null), names([...(result.order.length > 1 ? [result.order.at(-1)!] : []), ...result.missed]))
    case 'duell':
      return HEROLD.duell(name(result.winner))
    case 'schatzfrage':
      return HEROLD.schatzfrage(name(result.closest))
    case 'stadgeandring':
      return HEROLD.stadgeandring(result.passed)
    default:
      return ''
  }
}
