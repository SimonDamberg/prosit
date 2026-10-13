import { useState } from 'react'
import { getApi } from '../lib/supabase'
import type { Identity, MemberRow } from '../lib/types'
import { STRAFE_SHEET } from '../shared/content/phone'
import { STRAFE_REASONS } from '../shared/content/strafen'
import { cleanName, MAX_REASON_LENGTH } from '../shared/game/members'
import { Button, cx, Modal, toast } from '../ui'
import { reportError } from './report'

const CHIP = 'min-h-11 rounded-full px-4 text-base font-bold ring-2 ring-inset transition-colors'

interface StrafeSheetProps {
  open: boolean
  onClose: () => void
  identity: Identity
  members: readonly MemberRow[]
}

/** Pick a culprit and a reason. Anyone can hand a Strafe to anyone, themselves included. */
export function StrafeSheet({ open, onClose, identity, members }: StrafeSheetProps) {
  const [targetId, setTargetId] = useState<string | null>(null)
  const [preset, setPreset] = useState<string | null>(null)
  const [own, setOwn] = useState('')
  const [busy, setBusy] = useState(false)

  const target = members.find((m) => m.id === targetId) ?? null
  const reason = cleanName(own) || preset

  const close = () => {
    setTargetId(null)
    setPreset(null)
    setOwn('')
    onClose()
  }

  const submit = async () => {
    if (!target || !reason) return
    setBusy(true)
    try {
      await getApi().giveStrafe(identity, target.id, reason)
      toast({ text: STRAFE_SHEET.given(target.name), tone: 'win' })
      close()
    } catch (err) {
      reportError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={STRAFE_SHEET.title}
      tone="danger"
      actions={
        <>
          <Button variant="ghost" onClick={close}>
            {STRAFE_SHEET.cancel}
          </Button>
          <Button variant="danger" loading={busy} disabled={!target || !reason} onClick={submit}>
            {STRAFE_SHEET.submit}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold tracking-[0.15em] text-ink-dim uppercase">{STRAFE_SHEET.who}</p>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={m.id === targetId}
                onClick={() => setTargetId(m.id)}
                style={m.id === targetId ? { backgroundColor: m.colour, color: 'var(--color-night-deep)' } : { color: m.colour }}
                className={cx(CHIP, m.id === targetId ? 'ring-ink' : 'bg-night-deep ring-current')}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold tracking-[0.15em] text-ink-dim uppercase">{STRAFE_SHEET.why}</p>
          <div className="flex flex-wrap gap-2">
            {STRAFE_REASONS.map((r) => {
              const on = r === preset && !cleanName(own)
              return (
                <button
                  key={r}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setPreset(r)
                    setOwn('')
                  }}
                  className={cx(CHIP, on ? 'bg-drift text-white ring-drift' : 'bg-night-deep text-ink ring-tote-hi/60')}
                >
                  {r}
                </button>
              )
            })}
          </div>
          <label className="mt-1 flex flex-col gap-2">
            <span className="text-sm font-bold tracking-[0.15em] text-ink-dim uppercase">{STRAFE_SHEET.ownReason}</span>
            <input
              value={own}
              onChange={(e) => setOwn(e.target.value)}
              maxLength={MAX_REASON_LENGTH}
              placeholder={STRAFE_SHEET.ownPlaceholder}
              enterKeyHint="done"
              className="min-h-12 rounded-xl bg-night-deep px-4 text-lg font-semibold text-ink ring-2 ring-tote-hi/60 outline-none ring-inset placeholder:text-void focus:ring-drift"
            />
          </label>
        </div>
      </div>
    </Modal>
  )
}
