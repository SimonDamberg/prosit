import { useRef, useState } from 'react'
import { useResponses } from '../lib/hooks'
import { getApi } from '../lib/supabase'
import type { EventRow, Identity, ResponseRow } from '../lib/types'
import type { EventResponse } from '../shared/game/types'
import { reportError } from './report'

export interface AnswerState {
  /** Every answer to the event so far. undefined while loading. */
  responses: ResponseRow[] | undefined
  /** This member's answer, once given. */
  mine: EventResponse | null
  busy: boolean
  send: (payload: EventResponse) => Promise<void>
}

/** This member's one answer to an event: sends it, and knows it was given even after a reload. */
export function useAnswer(event: EventRow, identity: Identity): AnswerState {
  const responses = useResponses(event.id)
  const [sent, setSent] = useState<EventResponse | null>(null)
  const [busy, setBusy] = useState(false)
  // The stored row wins over what this phone sent: the database keeps the first answer only, so
  // a second send (after a reload, before the rows loaded) must not be shown as the answer.
  const mine = responses.data?.find((r) => r.memberId === identity.memberId)?.payload ?? sent ?? null

  // `busy` only disables the button on the next render. Two fingers on the Duell pad fire two
  // pointerdowns before that, so the guard has to be synchronous.
  const sending = useRef(false)
  const send = async (payload: EventResponse) => {
    if (sending.current) return
    sending.current = true
    setBusy(true)
    try {
      await getApi().respond(identity, event.id, payload)
      setSent(payload)
    } catch (err) {
      reportError(err)
    } finally {
      sending.current = false
      setBusy(false)
    }
  }

  return { responses: responses.data, mine, busy, send }
}
