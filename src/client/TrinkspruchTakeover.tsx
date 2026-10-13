import { TRINKSPRUCH } from '../shared/content/events'
import { fmtNumber, secondsLeft } from '../shared/game/format'
import { TRINKSPRUCH_FLOOR } from '../shared/game/resolve'
import { trinkspruchPhases } from '../shared/game/schedule'
import type { EventPayload } from '../shared/game/types'
import { Button } from '../ui'
import { LiveModal, VerdictModal } from './EventModal'
import type { TakeoverProps } from './PrositTakeover'
import { useAnswer } from './useAnswer'

type TrinkspruchProps = TakeoverProps & { payload: Extract<EventPayload, { kind: 'trinkspruch' }> }

const RATINGS = [1, 2, 3, 4, 5]

/** A toast speech on the phone: the speaker gets the topic and a clock, the others rate it after. */
export function TrinkspruchTakeover({ event, payload, identity, members, now }: TrinkspruchProps) {
  const { responses, mine, busy, send } = useAnswer(event, identity)
  const speaking = identity.memberId === payload.speaker
  const speaker = members.find((m) => m.id === payload.speaker)?.name ?? '?'

  const result = event.result?.kind === 'trinkspruch' ? event.result : null
  if (result) {
    const { average } = result
    const bad = average !== null && average < TRINKSPRUCH_FLOOR
    const verdict =
      average === null ? TRINKSPRUCH.none : !speaking ? TRINKSPRUCH.youJudged : bad ? TRINKSPRUCH.youBad : TRINKSPRUCH.youGood
    return (
      <VerdictModal title={TRINKSPRUCH.resultTitle} verdict={verdict} bad={speaking && bad}>
        <p>{TRINKSPRUCH.speaker(speaker)}</p>
        {average !== null && (
          <>
            <p className="font-bold text-weste">{TRINKSPRUCH.average(fmtNumber(average))}</p>
            <p>{bad ? TRINKSPRUCH.strafe(speaker) : TRINKSPRUCH.points(speaker, Math.round(average))}</p>
          </>
        )}
      </VerdictModal>
    )
  }

  const { speechFrom, speechTo } = trinkspruchPhases(event.startedAt, event.endsAt)
  const phase = now < speechFrom ? 'prep' : now < speechTo ? 'speech' : 'rating'
  const seconds = secondsLeft(phase === 'prep' ? speechFrom : phase === 'speech' ? speechTo : event.endsAt, now)
  const rating = mine?.kind === 'trinkspruch' ? mine.rating : null

  return (
    <LiveModal title={speaking ? TRINKSPRUCH.youSpeak : TRINKSPRUCH.speaker(speaker)} seconds={seconds}>
      <p className="font-display text-3xl leading-tight font-bold text-koenig">{payload.topic}</p>
      {speaking ? (
        <p className="text-xl font-bold">
          {phase === 'prep' ? TRINKSPRUCH.prep : phase === 'speech' ? TRINKSPRUCH.speaking : TRINKSPRUCH.sitDown}
        </p>
      ) : phase !== 'rating' ? (
        <p className="text-weste-dim">{TRINKSPRUCH.listen}</p>
      ) : rating !== null ? (
        <p className="text-weste-dim">{TRINKSPRUCH.rated(rating)}</p>
      ) : (
        <>
          <p className="text-xl font-bold">{TRINKSPRUCH.rateTitle}</p>
          <div className="grid w-full grid-cols-5 gap-2">
            {RATINGS.map((n) => (
              <Button
                key={n}
                disabled={busy || seconds === 0}
                onClick={() => send({ kind: 'trinkspruch', rating: n })}
                aria-label={TRINKSPRUCH.rate(n)}
                className="h-20 px-0 font-body text-3xl font-black"
              >
                {n}
              </Button>
            ))}
          </div>
        </>
      )}
      {phase === 'rating' && responses && (
        <p className="text-weste-dim">{TRINKSPRUCH.count(responses.length, Math.max(0, members.length - 1))}</p>
      )}
    </LiveModal>
  )
}
