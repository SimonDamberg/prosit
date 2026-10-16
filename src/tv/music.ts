// The band in the corner: one long YouTube mix on repeat that plays on the TV all night, and the real
// "Ein Prosit" that cuts it off whenever a PROSIT! strikes. Two hidden YouTube players, driven
// through the IFrame Player API. This is the one sound that is not synthesized (see audio.ts for
// the rest); if YouTube cannot be reached the night goes on without it.

import { play } from './audio'

/** What to play. Both can be replaced in `.env.local` / the Vercel env without touching the code. */
export const MUSIC = {
  /** The YouTube video id (the `v=` part of its link) of the background music, played on repeat: two hours of beer hall. */
  background: (import.meta.env.VITE_MUSIC_VIDEO as string | undefined) || 'WjdiMxXGZaE',
  /** YouTube video ids of "Ein Prosit der Gemütlichkeit", best first. The next is tried if one refuses to be embedded. */
  prosit: ((import.meta.env.VITE_PROSIT_VIDEO as string | undefined) || 'zdHxMkklvDI').split(',').map((id) => id.trim()),
  /** 0 to 100. The background is background, the Prosit is not. */
  volume: 45,
  /** The background while an event is on the stage, so the fanfares and the room can be heard. */
  ducked: 12,
  prositVolume: 100,
} as const

// The few parts of the IFrame API this file uses.
interface Player {
  playVideo(): void
  pauseVideo(): void
  stopVideo(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  loadVideoById(id: string, startSeconds?: number): void
  cueVideoById(id: string): void
  setVolume(volume: number): void
  /** -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued. */
  getPlayerState(): number
}
interface PlayerOptions {
  width: number
  height: number
  videoId?: string
  playerVars?: Record<string, string | number>
  events?: {
    onReady?: () => void
    onError?: (e: { data: number }) => void
    onStateChange?: (e: { data: number }) => void
  }
}
interface YouTube {
  Player: new (el: HTMLElement, options: PlayerOptions) => Player
}
declare global {
  interface Window {
    YT?: YouTube
    onYouTubeIframeAPIReady?: () => void
  }
}

const ENDED = 0

let started = false
let band: Player | null = null
let bandReady = false
let singer: Player | null = null
/** The Prosit video in MUSIC.prosit that is loaded, and whether YouTube has agreed to play it. */
let take = 0
let singerReady = false
let singing = false
let busy = false
let speaking = false

/** For the styleguide: what the two players are up to. */
export const musicState = () => ({
  started,
  bandReady,
  singerReady,
  singing,
  video: MUSIC.prosit[take] ?? null,
  bandState: bandReady ? band?.getPlayerState() : undefined,
  singerState: singerReady ? singer?.getPlayerState() : undefined,
})

function loadApi(): Promise<YouTube> {
  return new Promise((resolve, reject) => {
    if (window.YT?.Player) return resolve(window.YT)
    window.onYouTubeIframeAPIReady = () => resolve(window.YT!)
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.onerror = reject
    document.head.append(script)
  })
}

/** A player needs an element on the page. It gets one where nobody sees it. */
function mount(): HTMLElement {
  const box = document.createElement('div')
  box.style.cssText = 'position:fixed;left:-9999px;bottom:0;width:320px;height:180px;pointer-events:none'
  box.setAttribute('aria-hidden', 'true')
  const el = document.createElement('div')
  box.append(el)
  document.body.append(box)
  return el
}

/**
 * Starts the background music. Call from the tap that unlocks the sound: a browser lets a page start
 * music only after one. Safe to call again.
 */
export function startMusic() {
  if (started) return
  started = true
  loadApi()
    .then((YT) => {
      const size = { width: 320, height: 180 }
      const quiet = { controls: 0, disablekb: 1, playsinline: 1, rel: 0 }
      band = new YT.Player(mount(), {
        ...size,
        videoId: MUSIC.background,
        playerVars: quiet,
        events: {
          onReady: () => {
            bandReady = true
            band!.setVolume(level())
            if (!singing) band!.playVideo()
          },
          // On repeat: the end of the mix is its beginning.
          onStateChange: ({ data }) => {
            if (data !== ENDED) return
            band!.seekTo(0, true)
            band!.playVideo()
          },
        },
      })
      singer = new YT.Player(mount(), {
        ...size,
        videoId: MUSIC.prosit[take],
        playerVars: quiet,
        events: {
          onReady: () => {
            singerReady = true
            singer!.setVolume(MUSIC.prositVolume)
          },
          // This recording is gone or may not be embedded: the next one takes over, mid-song if
          // need be. When none is left the synthesized tune plays, now and from then on.
          onError: () => {
            take++
            if (take < MUSIC.prosit.length) {
              if (singing) singer!.loadVideoById(MUSIC.prosit[take], 0)
              else singer!.cueVideoById(MUSIC.prosit[take])
              return
            }
            singerReady = false
            if (!singing) return
            stopProsit()
            play('prosit')
          },
          onStateChange: ({ data }) => {
            if (data === ENDED) stopProsit()
          },
        },
      })
    })
    .catch(() => {
      // No YouTube, no band. The synthesized sounds still play.
    })
}

/**
 * The background music stops dead and "Ein Prosit" starts from the top. False if it cannot (no YouTube,
 * no video that may be embedded): the caller then plays the synthesized tune instead.
 */
export function playProsit(): boolean {
  if (!singer || !singerReady) return false
  singing = true
  band?.pauseVideo()
  singer.setVolume(MUSIC.prositVolume)
  singer.loadVideoById(MUSIC.prosit[take], 0)
  return true
}

/** The Prosit is over (or the stage is clear): back to the background music. */
export function stopProsit() {
  if (!singing) return
  singing = false
  singer?.stopVideo()
  if (bandReady) band?.playVideo()
}

/** An event is on the stage, or the stage is clear again. The background steps back while one is. */
export function setStageBusy(on: boolean) {
  busy = on
  if (!on) stopProsit()
  if (bandReady) band?.setVolume(level())
}

/** Der Herold is speaking (herold.ts): the background steps back for him too. */
export function setHeroldBusy(on: boolean) {
  speaking = on
  if (bandReady) band?.setVolume(level())
}

/** The background's volume: ducked while an event has the stage or the Herold speaks. */
function level(): number {
  return busy || speaking ? MUSIC.ducked : MUSIC.volume
}
