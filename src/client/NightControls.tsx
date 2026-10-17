import { useState } from 'react'
import { getApi } from '../lib/supabase'
import type { Identity, NightRow } from '../lib/types'
import { NIGHT } from '../shared/content/events'
import { EVENT_KINDS, type EventKind } from '../shared/game/types'
import { Button, Modal, toast } from '../ui'
import { reportError } from './report'

// Minutes between events that a member can step through. The short ones are for trying it out.
const STEPS = import.meta.env.DEV ? [0.5, 1, 3, 5, 8, 10, 12, 15, 20, 30] : [3, 5, 8, 10, 12, 15, 20, 30]

const fmtMinutes = (minutes: number) => String(minutes).replace('.', ',')

interface NightControlsProps {
  night: NightRow
  identity: Identity
  /** Dev only: open the next event now, as this kind if given. */
  onTrigger: (kind?: EventKind) => Promise<void>
}

/** Any member starts the night and sets how often events strike. There is no game master. */
export function NightControls({ night, identity, onTrigger }: NightControlsProps) {
  const [busy, setBusy] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)

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
      <Button block disabled={busy} onClick={() => run(() => onTrigger('prosit'))}>
        {NIGHT.callProsit}
      </Button>
      <Button variant="danger" block disabled={busy} onClick={() => setConfirmEnd(true)}>
        {NIGHT.end}
      </Button>
      <Modal
        open={confirmEnd}
        onClose={() => setConfirmEnd(false)}
        title={NIGHT.endTitle}
        tone="danger"
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmEnd(false)}>
              {NIGHT.endCancel}
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={() => run(() => getApi().endNight(identity)).then(() => setConfirmEnd(false))}
            >
              {NIGHT.endConfirm}
            </Button>
          </>
        }
      >
        <p>{NIGHT.endText}</p>
      </Modal>
      {import.meta.env.DEV && (
        <>
          <Button variant="ghost" block disabled={busy} onClick={() => run(() => onTrigger())}>
            {NIGHT.devTrigger}
          </Button>
          <div className="grid grid-cols-3 gap-2">
            {EVENT_KINDS.map((kind) => (
              <Button key={kind} variant="ghost" disabled={busy} onClick={() => run(() => onTrigger(kind))} className="px-1 text-base">
                {NIGHT.devKinds[kind]}
              </Button>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
