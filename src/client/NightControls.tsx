import { useState } from 'react'
import { getApi } from '../lib/supabase'
import type { Identity, NightRow } from '../lib/types'
import { NIGHT } from '../shared/content/events'
import { Button, toast } from '../ui'
import { reportError } from './report'

// Minutes between events that a member can step through. The short ones are for trying it out.
const STEPS = import.meta.env.DEV ? [0.5, 1, 3, 5, 8, 10, 12, 15, 20, 30] : [3, 5, 8, 10, 12, 15, 20, 30]

const fmtMinutes = (minutes: number) => String(minutes).replace('.', ',')

interface NightControlsProps {
  night: NightRow
  identity: Identity
  /** Dev only: open the next event now. */
  onTrigger: () => Promise<void>
}

/** Any member starts the night and sets how often events strike. There is no game master. */
export function NightControls({ night, identity, onTrigger }: NightControlsProps) {
  const [busy, setBusy] = useState(false)

  const run = async (call: () => Promise<unknown>, done?: string) => {
    setBusy(true)
    try {
      await call()
      if (done) toast({ text: done, tone: 'win' })
    } catch (err) {
      reportError(err)
    } finally {
      setBusy(false)
    }
  }

  if (night.status === 'idle') {
    return (
      <section className="sign flex flex-col gap-3 px-5 py-5 text-center">
        <h2 className="font-display text-4xl leading-none font-bold text-koenig">{NIGHT.idleTitle}</h2>
        <p className="text-base text-weste-dim">{NIGHT.idleText}</p>
        <Button size="lg" block loading={busy} onClick={() => run(() => getApi().startNight(identity), NIGHT.started)}>
          {NIGHT.start}
        </Button>
      </section>
    )
  }
  if (night.status !== 'live') return null

  const slower = STEPS.find((s) => s > night.intervalMin)
  const faster = STEPS.filter((s) => s < night.intervalMin).at(-1)
  const setInterval = (minutes: number) => run(() => getApi().setInterval(identity, minutes))

  return (
    <section className="flex flex-col gap-3">
      <h2 className="label-rule text-base">{NIGHT.liveTitle}</h2>
      <p className="text-center text-base font-bold">{NIGHT.interval(fmtMinutes(night.intervalMin))}</p>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="quiet" disabled={busy || faster === undefined} onClick={() => setInterval(faster!)}>
          {NIGHT.faster}
        </Button>
        <Button variant="quiet" disabled={busy || slower === undefined} onClick={() => setInterval(slower!)}>
          {NIGHT.slower}
        </Button>
      </div>
      {import.meta.env.DEV && (
        <Button variant="ghost" block disabled={busy} onClick={() => run(onTrigger)}>
          {NIGHT.devTrigger}
        </Button>
      )}
    </section>
  )
}
