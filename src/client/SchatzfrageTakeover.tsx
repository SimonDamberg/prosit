import { useState, type FormEvent } from 'react'
import { SCHATZFRAGE } from '../shared/content/events'
import { fmtNumber, secondsLeft } from '../shared/game/format'
import type { EventPayload } from '../shared/game/types'
import { Button } from '../ui'
import { LiveModal, VerdictModal } from './EventModal'
import type { TakeoverProps } from './PrositTakeover'
import { useAnswer } from './useAnswer'

type SchatzfrageProps = TakeoverProps & { payload: Extract<EventPayload, { kind: 'schatzfrage' }> }

/** "1 516", "3,5" or "-2" as a number; null for anything else. */
function parseGuess(text: string): number | null {
  const tidy = text.replace(/\s/g, '').replace(',', '.')
  if (!/^-?\d+(\.\d+)?$/.test(tidy)) return null
  const value = Number(tidy)
  return Number.isFinite(value) ? value : null
}

/** An estimate question on the phone: one number field, then the answer and who was where. */
export function SchatzfrageTakeover({ event, payload, identity, members, now }: SchatzfrageProps) {
  const { responses, mine, busy, send } = useAnswer(event, identity)
  const [text, setText] = useState('')
  const me = identity.memberId
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? '?'

  const result = event.result?.kind === 'schatzfrage' ? event.result : null
  if (result) {
    const own = result.guesses[me]
    const verdict =
      own === undefined
        ? SCHATZFRAGE.youSilent
        : result.closest === me
          ? SCHATZFRAGE.youClosest
          : result.furthest === me
            ? SCHATZFRAGE.youFurthest
            : SCHATZFRAGE.youFine
    return (
      <VerdictModal title={SCHATZFRAGE.resultTitle} verdict={verdict} bad={result.furthest === me}>
        <p>{payload.question}</p>
        <p className="font-bold text-weste">{SCHATZFRAGE.answerLabel}: {SCHATZFRAGE.value(fmtNumber(payload.answer), payload.unit)}</p>
        {own !== undefined && <p>{SCHATZFRAGE.yourGuess(fmtNumber(own))}</p>}
        {result.closest === null ? (
          <p>{SCHATZFRAGE.nobody}</p>
        ) : (
          <>
            <p>{SCHATZFRAGE.closest(nameOf(result.closest))}</p>
            <p>{result.furthest !== null ? SCHATZFRAGE.strafe(nameOf(result.furthest)) : SCHATZFRAGE.noStrafe}</p>
          </>
        )}
      </VerdictModal>
    )
  }

  const seconds = secondsLeft(event.endsAt, now)
  const guess = parseGuess(text)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (guess !== null) void send({ kind: 'schatzfrage', guess })
  }
  return (
    <LiveModal title={SCHATZFRAGE.kicker} seconds={seconds}>
      <p className="text-2xl leading-tight font-bold">{payload.question}</p>
      {mine !== null ? (
        <p className="text-weste-dim">{SCHATZFRAGE.sent}</p>
      ) : (
        <form onSubmit={submit} className="flex w-full flex-col gap-3">
          <p className="text-weste-dim">{SCHATZFRAGE.call}</p>
          <label className="flex items-center gap-3">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              inputMode="decimal"
              maxLength={12}
              placeholder={SCHATZFRAGE.placeholder}
              aria-label={SCHATZFRAGE.placeholder}
              enterKeyHint="done"
              className="min-h-16 min-w-0 flex-1 rounded-md bg-card px-4 text-center text-3xl font-black text-weste tabular-nums ring-2 ring-koenig/40 outline-none ring-inset placeholder:text-lg placeholder:font-semibold placeholder:text-weste-dim/50 focus:ring-koenig"
            />
            {payload.unit && <span className="text-lg font-bold text-weste-dim">{payload.unit}</span>}
          </label>
          <Button type="submit" size="lg" block loading={busy} disabled={guess === null || seconds === 0}>
            {SCHATZFRAGE.submit}
          </Button>
        </form>
      )}
      {responses && <p className="text-weste-dim">{SCHATZFRAGE.count(responses.length, members.length)}</p>}
    </LiveModal>
  )
}
