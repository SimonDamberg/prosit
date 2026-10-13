import { useState } from 'react'
import { getApi } from '../lib/supabase'
import type { Identity, MemberRow } from '../lib/types'
import { STRAFE_SHEET } from '../shared/content/phone'
import { STRAFE_REASONS } from '../shared/content/strafen'
import { cleanName, MAX_REASON_LENGTH } from '../shared/game/members'
import { Button, cx, Modal, toast } from '../ui'
import { reportError } from './report'

const CHIP = 'min-h-11 rounded-md px-4 text-base font-bold ring-2 ring-inset transition-colors'

interface StrafeSheetProps {
  open: boolean
  onClose: () => void
  identity: Identity
  members: readonly MemberRow[]
  /** Reasons offered ahead of the standing ones: breaches of the rules in force. */
  extraReasons?: readonly string[]
  /** Reason picked from the start. Read when the sheet mounts, so remount it (key) per opening. */
  initialReason?: string | null
}

/** Pick a culprit and a reason. Anyone can hand a Strafe to anyone, themselves included. */
export function StrafeSheet({ open, onClose, identity, members, extraReasons = [], initialReason = null }: StrafeSheetProps) {
  const [targetId, setTargetId] = useState<string | null>(null)
  const [preset, setPreset] = useState<string | null>(initialReason)
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
          <p className="label-rule text-base">{STRAFE_SHEET.who}</p>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={m.id === targetId}
                onClick={() => setTargetId(m.id)}
                style={m.id === targetId ? { backgroundColor: m.colour, color: 'var(--color-card)' } : { color: m.colour }}
                className={cx(CHIP, m.id === targetId ? 'ring-weste' : 'bg-card ring-current')}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="label-rule text-base">{STRAFE_SHEET.why}</p>
          <div className="flex flex-wrap gap-2">
            {[...extraReasons, ...STRAFE_REASONS].map((r) => {
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
                  className={cx(CHIP, on ? 'bg-strafe text-white ring-strafe' : 'bg-card text-weste ring-koenig/40')}
                >
                  {r}
                </button>
              )
            })}
          </div>
          <label className="mt-1 flex flex-col gap-2">
            <span className="label-rule text-base">{STRAFE_SHEET.ownReason}</span>
            <input
              value={own}
              onChange={(e) => setOwn(e.target.value)}
              maxLength={MAX_REASON_LENGTH}
              placeholder={STRAFE_SHEET.ownPlaceholder}
              enterKeyHint="done"
              className="min-h-12 rounded-md bg-card px-4 text-lg font-semibold text-weste ring-2 ring-koenig/40 outline-none ring-inset placeholder:text-weste-dim/50 focus:ring-strafe"
            />
          </label>
        </div>
      </div>
    </Modal>
  )
}
