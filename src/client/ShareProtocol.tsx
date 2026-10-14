import { useEffect, useState } from 'react'
import type { MemberRow } from '../lib/types'
import { PROTOCOL_SHARE } from '../shared/content/phone'
import type { ProtocolRow } from '../shared/game/awards'
import { Button, toast } from '../ui'
import { drawProtocol, shareProtocol } from './protocolImage'

interface ShareProtocolProps {
  rows: readonly ProtocolRow[]
  members: readonly MemberRow[]
  /** Server time the night ended, for the date on the image. */
  endedAt: number | null
}

/**
 * "Dela protokollet": the image is drawn as soon as the screen opens, so the tap can go straight to
 * the share sheet (Safari only opens one straight from a tap).
 */
export function ShareProtocol({ rows, members, endedAt }: ShareProtocolProps) {
  const [png, setPng] = useState<Blob | null>(null)

  useEffect(() => {
    let cancelled = false
    drawProtocol(rows, members, new Date(endedAt ?? Date.now()))
      .then((blob) => !cancelled && setPng(blob))
      .catch(() => !cancelled && toast({ text: PROTOCOL_SHARE.failed, tone: 'error' }))
    return () => {
      cancelled = true
    }
  }, [rows, members, endedAt])

  const share = async () => {
    if (!png) return
    try {
      if (await shareProtocol(png)) toast({ text: PROTOCOL_SHARE.saved, tone: 'win' })
    } catch {
      toast({ text: PROTOCOL_SHARE.failed, tone: 'error' })
    }
  }

  return (
    <Button size="lg" block loading={png === null} onClick={share}>
      {png === null ? PROTOCOL_SHARE.busy : PROTOCOL_SHARE.button}
    </Button>
  )
}
