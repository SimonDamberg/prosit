import { useEffect } from 'react'
import { useConnection, useEvents, useMe, useMembers, useNight } from '../lib/hooks'
import { useEngine } from '../lib/useEngine'
import { ENDED, PHONE_LOADING } from '../shared/content/phone'
import { BRAND } from '../shared/content/ui'
import { ConnectionBadge, Crest, LoadingScreen, Toaster } from '../ui'
import { CLAIM_PARAM, claimMember } from './claim'
import { HomeScreen } from './HomeScreen'
import { JoinScreen } from './JoinScreen'

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-rauten p-4">
      <div className="sign flex w-full max-w-md flex-col items-center gap-5 px-6 py-8 text-center">
        <Crest />
        <h1 className="font-display text-6xl leading-none font-bold text-koenig">{title}</h1>
        <p className="text-lg text-weste-dim">{text}</p>
      </div>
    </main>
  )
}

/** Phone app: join, then the drink log and the events. Every joined phone also runs the engine. */
/** A handover link (`/?claim=CODE`): claim the member once, then drop the code from the address. */
function useClaimLink(onClaimed: () => void) {
  useEffect(() => {
    const url = new URL(window.location.href)
    const code = url.searchParams.get(CLAIM_PARAM)
    if (!code) return
    url.searchParams.delete(CLAIM_PARAM)
    window.history.replaceState(null, '', url)
    void claimMember(code).then((ok) => ok && onClaimed())
    // Once per page load: the code is spent by the first try.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

export default function ClientApp() {
  const connection = useConnection()
  const night = useNight()
  const members = useMembers()
  const events = useEvents()
  const { identity, me } = useMe(members.data)
  useClaimLink(members.reload)
  const engine = useEngine(identity, { night: night.data, events: events.data, members: members.data }, Boolean(me))
  const error = night.error ?? members.error

  let screen
  if (error?.code === 'config') {
    screen = <Notice title={BRAND.name} text={error.message} />
  } else if (!night.data || !members.data) {
    screen = <LoadingScreen label={PHONE_LOADING.data} />
  } else if (!identity) {
    screen =
      night.data.status === 'ended' ? (
        <Notice title={ENDED.title} text={ENDED.text} />
      ) : (
        <JoinScreen members={members.data} onJoined={members.reload} />
      )
  } else if (!me || !events.data) {
    screen = <LoadingScreen label={PHONE_LOADING.member} />
  } else {
    screen = (
      <HomeScreen
        me={me}
        identity={identity}
        members={members.data}
        night={night.data}
        events={events.data}
        connection={connection}
        onTrigger={engine.triggerNow}
      />
    )
  }

  return (
    <>
      <ConnectionBadge status={connection} variant="banner" className="sticky top-0 z-30" />
      {screen}
      <Toaster />
    </>
  )
}
