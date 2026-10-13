import { useSyncExternalStore } from 'react'
import { TV_STAGE } from '../shared/content/events'
import { Button, Crest } from '../ui'
import { audioStore, play, unlockAudio } from './audio'
import { startMusic } from './music'

/** The one tap the TV ever needs: it lets the browser play sound, answers with a bell and starts the music. Gone once that works. */
export function AudioGate() {
  const unlocked = useSyncExternalStore(audioStore.subscribe, audioStore.isUnlocked, () => true)
  if (unlocked) return null
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-rauten p-16" onClick={() => {
        startMusic()
        void unlockAudio().then(() => play('unlock'))
      }}>
      <div className="sign flex max-w-5xl flex-col items-center gap-8 px-16 py-12 text-center">
        <Crest size="tv" />
        <h1 className="font-display text-tv-xl leading-none font-bold text-koenig">{TV_STAGE.unlockTitle}</h1>
        <p className="text-tv-md text-weste-dim">{TV_STAGE.unlockText}</p>
        <Button size="tv" autoFocus>
          {TV_STAGE.unlockButton}
        </Button>
      </div>
    </div>
  )
}
