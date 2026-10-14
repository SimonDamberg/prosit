import { useConnection, useDrinks, useEvents, useMembers, useNight, usePoints, useServerNow, useStrafen } from '../lib/hooks'
import { useEngine } from '../lib/useEngine'
import { TV_DATA_LOADING } from '../shared/content/tv'
import { BRAND } from '../shared/content/ui'
import { ConnectionBadge, Crest, LoadingScreen, Toaster } from '../ui'
import { AudioGate } from './AudioGate'
import { Dashboard } from './Dashboard'
import { Finale } from './Finale'
import { useWakeLock } from './useWakeLock'

// Nobody reloads a TV, so every list is also refetched now and then (see LiveHookOptions).
const POLL = { pollMs: 15_000 }

/** The ceremony ticks on its own clock, so the dashboard's does not run under it. */
function FinaleScreen(props: Omit<Parameters<typeof Finale>[0], 'now'>) {
  const now = useServerNow(250)
  return <Finale {...props} now={now} />
}

/**
 * TV app: the live dashboard and the stage for every event. Pure output: after the one tap that
 * unlocks the sound, nothing here is tappable. It also runs the engine, as nobody: the TV is the
 * one device that stays awake all night.
 */
export default function TvApp() {
  useWakeLock()
  const connection = useConnection()
  const night = useNight(POLL)
  const members = useMembers(POLL)
  const drinks = useDrinks(POLL)
  const strafen = useStrafen(POLL)
  const events = useEvents(POLL)
  const points = usePoints(POLL)
  useEngine(null, { night: night.data, events: events.data, members: members.data })
  const error = night.error ?? members.error ?? drinks.error ?? strafen.error ?? events.error ?? points.error

  let screen
  if (error?.code === 'config') {
    screen = (
      <main className="flex h-full items-center justify-center bg-rauten p-16">
        <div className="sign flex max-w-5xl flex-col items-center gap-8 px-16 py-12 text-center">
          <Crest size="tv" />
          <h1 className="font-display text-[10rem] leading-none font-bold text-koenig">{BRAND.name}</h1>
          <p className="text-tv-md text-weste-dim">{error.message}</p>
        </div>
      </main>
    )
  } else if (!night.data || !members.data || !drinks.data || !strafen.data || !events.data || !points.data) {
    screen = <LoadingScreen label={TV_DATA_LOADING} />
  } else if (night.data.status === 'ended') {
    screen = (
      <FinaleScreen
        night={night.data}
        members={members.data}
        drinks={drinks.data}
        strafen={strafen.data}
        points={points.data}
        events={events.data}
      />
    )
  } else {
    screen = (
      <Dashboard
        night={night.data}
        members={members.data}
        drinks={drinks.data}
        strafen={strafen.data}
        points={points.data}
        events={events.data}
      />
    )
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <ConnectionBadge status={connection} variant="banner" size="tv" />
      <div className="relative min-h-0 flex-1">
        {screen}
        <AudioGate />
      </div>
      {/* Over the tagline in the header, clear of the panels and the totals. */}
      <Toaster size="tv" className="top-9! bottom-auto! left-[27rem]!" />
    </div>
  )
}
