import { useState } from 'react'
import { getApi } from '../lib/supabase'
import type { Identity, MemberRow } from '../lib/types'
import { HANDOVER } from '../shared/content/phone'
import { Button, Modal, QrCode } from '../ui'
import { claimUrl } from './claim'
import { reportError } from './report'

/**
 * Any member can show any member's card: a QR (and a code) that a new phone trades for that
 * member. For a phone that was lost, reset or swapped, so nobody has to join twice.
 */
export function HandoverPanel({ identity, members }: { identity: Identity; members: readonly MemberRow[] }) {
  const [picking, setPicking] = useState(false)
  const [card, setCard] = useState<{ member: MemberRow; code: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const issue = async (member: MemberRow) => {
    setBusy(member.id)
    try {
      const code = await getApi().issueClaim(identity, member.id)
      setPicking(false)
      setCard({ member, code })
    } catch (err) {
      reportError(err)
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="label-rule text-base">{HANDOVER.title}</h2>
      <p className="text-base text-weste-dim">{HANDOVER.text}</p>
      <Button variant="ghost" block onClick={() => setPicking(true)}>
        {HANDOVER.button}
      </Button>

      <Modal open={picking} onClose={() => setPicking(false)} title={HANDOVER.pickTitle}>
        <div className="grid grid-cols-2 gap-3">
          {members.map((m) => (
            <Button
              key={m.id}
              variant="quiet"
              loading={busy === m.id}
              disabled={busy !== null}
              onClick={() => issue(m)}
              style={{ color: m.colour }}
              className="min-h-16 px-2"
            >
              <span className="truncate">
                {m.name} {m.id === identity.memberId && HANDOVER.you}
              </span>
            </Button>
          ))}
        </div>
      </Modal>

      <Modal
        open={card !== null}
        onClose={() => setCard(null)}
        title={card ? HANDOVER.cardTitle(card.member.name) : undefined}
        tone="accent"
        actions={<Button onClick={() => setCard(null)}>{HANDOVER.close}</Button>}
      >
        {card && (
          <div className="flex flex-col items-center gap-4 text-center">
            <QrCode value={claimUrl(card.code)} label={HANDOVER.cardTitle(card.member.name)} className="size-60 border-2 border-koenig" />
            <p className="text-weste-dim">{HANDOVER.scan}</p>
            <p>
              {HANDOVER.code}{' '}
              <span className="font-body text-2xl font-black tracking-[0.2em] text-koenig select-all">{card.code}</span>
            </p>
            <p className="text-sm font-bold text-strafe">{HANDOVER.warning}</p>
          </div>
        )}
      </Modal>
    </section>
  )
}
