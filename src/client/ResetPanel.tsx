import { useState } from 'react'
import { getApi } from '../lib/supabase'
import type { Identity } from '../lib/types'
import { RESET } from '../shared/content/phone'
import { Button, Modal, toast } from '../ui'
import { reportError } from './report'

/** Any member can wipe the log and start a new night, with the roll of members or without it. */
export function ResetPanel({ identity }: { identity: Identity }) {
  const [open, setOpen] = useState(false)
  const [wipe, setWipe] = useState(false)
  const [busy, setBusy] = useState(false)

  const close = () => {
    setOpen(false)
    setWipe(false)
  }

  const reset = async () => {
    setBusy(true)
    try {
      await getApi().resetNight(identity, wipe)
      toast({ text: RESET.done, tone: 'win' })
      close()
    } catch (err) {
      reportError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="label-rule text-base">{RESET.title}</h2>
      <p className="text-base text-weste-dim">{RESET.text}</p>
      <Button variant="ghost" block onClick={() => setOpen(true)}>
        {RESET.button}
      </Button>
      <Modal
        open={open}
        onClose={close}
        title={RESET.confirmTitle}
        tone="danger"
        actions={
          <>
            <Button variant="ghost" onClick={close}>
              {RESET.cancel}
            </Button>
            <Button variant="danger" loading={busy} onClick={reset}>
              {RESET.confirm}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p>{RESET.confirmText}</p>
          <label className="flex items-start gap-3 rounded-md bg-paper-deep px-4 py-3">
            <input
              type="checkbox"
              checked={wipe}
              onChange={(e) => setWipe(e.target.checked)}
              className="mt-1 size-6 shrink-0 accent-strafe"
            />
            <span className="flex flex-col gap-1">
              <span className="font-bold">{RESET.wipe}</span>
              <span className="text-sm text-weste-dim">{RESET.wipeHint}</span>
            </span>
          </label>
        </div>
      </Modal>
    </section>
  )
}
