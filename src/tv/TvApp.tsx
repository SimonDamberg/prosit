import { useConnection, useDrinks, useMembers, useNight, useStrafen } from '../lib/hooks'
import { TV_DATA_LOADING } from '../shared/content/tv'
import { BRAND } from '../shared/content/ui'
import { ConnectionBadge, Crest, LoadingScreen, Toaster } from '../ui'
import { Dashboard } from './Dashboard'
import { useWakeLock } from './useWakeLock'

// Nobody reloads a TV, so every list is also refetched now and then (see LiveHookOptions).
const POLL = { pollMs: 15_000 }

/** TV app: the live dashboard. Pure output, nothing here is tappable. */
export default function TvApp() {
  useWakeLock()
  const connection = useConnection()
  const night = useNight(POLL)
  const members = useMembers(POLL)
  const drinks = useDrinks(POLL)
  const strafen = useStrafen(POLL)
  const error = night.error ?? members.error ?? drinks.error ?? strafen.error

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
  } else if (!night.data || !members.data || !drinks.data || !strafen.data) {
    screen = <LoadingScreen label={TV_DATA_LOADING} />
  } else {
    screen = (
      <Dashboard
        night={night.data}
        members={members.data}
        drinks={drinks.data}
        strafen={strafen.data}
        connection={connection}
      />
    )
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <ConnectionBadge status={connection} variant="banner" size="tv" />
      <div className="min-h-0 flex-1">{screen}</div>
      {/* Over the tagline in the header, clear of the panels and the totals. */}
      <Toaster size="tv" className="top-9! bottom-auto! left-[27rem]!" />
    </div>
  )
}
