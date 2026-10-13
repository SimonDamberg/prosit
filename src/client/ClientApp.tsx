import { useConnection, useMe, useMembers, useNight } from '../lib/hooks'
import { ENDED, PHONE_LOADING } from '../shared/content/phone'
import { BRAND } from '../shared/content/ui'
import { ConnectionBadge, LoadingScreen, Toaster } from '../ui'
import { HomeScreen } from './HomeScreen'
import { JoinScreen } from './JoinScreen'

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-bold tracking-[0.2em] text-ink-dim uppercase">{BRAND.club}</p>
      <h1 className="font-display text-6xl leading-none font-black text-plate uppercase">{title}</h1>
      <p className="text-lg text-ink-dim">{text}</p>
    </main>
  )
}

/** Phone app: join, then the drink log. */
export default function ClientApp() {
  const connection = useConnection()
  const night = useNight()
  const members = useMembers()
  const { identity, me } = useMe(members.data)
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
  } else if (!me) {
    screen = <LoadingScreen label={PHONE_LOADING.member} />
  } else {
    screen = (
      <HomeScreen
        me={me}
        identity={identity}
        members={members.data}
        ended={night.data.status === 'ended'}
        connection={connection}
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
