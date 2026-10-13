import { useState } from 'react'
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
  const mine = sent ?? responses.data?.find((r) => r.memberId === identity.memberId)?.payload ?? null

  const send = async (payload: EventResponse) => {
    setBusy(true)
    try {
      await getApi().respond(identity, event.id, payload)
      setSent(payload)
    } catch (err) {
      reportError(err)
    } finally {
      setBusy(false)
    }
  }

  return { responses: responses.data, mine, busy, send }
}
