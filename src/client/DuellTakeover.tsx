import { useEffect, useState } from 'react'
import { useServerClock } from '../lib/hooks'
import { DUELL } from '../shared/content/events'
import type { EventPayload } from '../shared/game/types'
import { Button, cx } from '../ui'
import { LiveModal, VerdictModal } from './EventModal'
import type { TakeoverProps } from './PrositTakeover'
import { useAnswer } from './useAnswer'

type DuellProps = TakeoverProps & { payload: Extract<EventPayload, { kind: 'duell' }> }

/**
 * A Duell on the phone. The two duellists get one pad: it says wait, then "Zieh!", and the first
 * to hit it after that wins. Everybody else picks a winner until the draw.
 */
export function DuellTakeover({ event, payload, identity, members }: DuellProps) {
  const { mine, busy, send } = useAnswer(event, identity)
  const { now } = useServerClock()
  const me = identity.memberId
  const duellist = me === payload.a || me === payload.b
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? '?'

  // The draw is shown by a timer on server time, not by the half-second tick of the screen.
  const drawAt = event.startedAt + payload.drawAfterMs
  const [drawn, setDrawn] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setDrawn(true), Math.max(0, drawAt - now()))
    return () => clearTimeout(timer)
  }, [drawAt, now])

  const result = event.result?.kind === 'duell' ? event.result : null
  if (result) {
    const { winner, loser } = result
    const picked = mine?.kind === 'duell_pick' ? mine.pick : null
    let verdict: string
    if (winner === null) verdict = duellist ? DUELL.youBoth : DUELL.youShrugged
    else if (me === winner) verdict = DUELL.youWon
    else if (me === loser) verdict = DUELL.youLost
    else if (picked === null) verdict = DUELL.youWatched
    else verdict = picked === winner ? DUELL.youPickedRight : DUELL.youPickedWrong
    return (
      <VerdictModal title={DUELL.resultTitle} verdict={verdict} bad={duellist && me !== winner}>
        {winner !== null && loser !== null ? (
          <>
            <p>{DUELL.winner(nameOf(winner), result.reactions[winner])}</p>
            <p>{DUELL.strafe(nameOf(loser))}</p>
          </>
        ) : (
          <p>{DUELL.nobody}</p>
        )}
      </VerdictModal>
    )
  }

  const title = `${nameOf(payload.a)} ${DUELL.versus} ${nameOf(payload.b)}`

  if (duellist) {
    const shot = mine?.kind === 'duell' ? mine : null
    // What the pad showed decides, so a tap is never judged against a clock the eye could not see.
    const shoot = () => {
      const tapMs = Math.round(now() - event.startedAt)
      void send({ kind: 'duell', tapMs: drawn ? Math.max(tapMs, payload.drawAfterMs) : Math.min(tapMs, payload.drawAfterMs - 1) })
    }
    return (
      <LiveModal title={DUELL.title}>
        <p className="text-xl font-bold">{title}</p>
        <button
          type="button"
          disabled={shot !== null || busy}
          onPointerDown={shoot}
          className={cx(
            'flex h-64 w-full touch-none items-center justify-center rounded-lg font-display text-7xl leading-none font-bold select-none',
            drawn ? 'bg-strafe text-white' : 'bg-paper-deep text-weste-dim ring-2 ring-koenig/40 ring-inset',
            'disabled:opacity-50',
          )}
        >
          {drawn ? DUELL.draw : DUELL.wait}
        </button>
        <p className="text-weste-dim">
          {shot === null ? DUELL.ready : shot.tapMs < payload.drawAfterMs ? DUELL.falseStart : DUELL.tapped}
        </p>
      </LiveModal>
    )
  }

  const picked = mine?.kind === 'duell_pick' ? mine.pick : null
  return (
    <LiveModal title={DUELL.title}>
      <p className="text-xl font-bold">{title}</p>
      {picked !== null ? (
        <p className="text-weste-dim">{DUELL.picked(nameOf(picked))}</p>
      ) : drawn ? (
        <p className="text-weste-dim">{DUELL.pickClosed}</p>
      ) : (
        <>
          <p className="text-weste-dim">{DUELL.pickTitle}</p>
          <div className="grid w-full grid-cols-2 gap-3">
            {[payload.a, payload.b].map((id) => (
              <Button key={id} variant="quiet" disabled={busy} onClick={() => send({ kind: 'duell_pick', pick: id })} className="h-28 px-2">
                {nameOf(id)}
              </Button>
            ))}
          </div>
        </>
      )}
    </LiveModal>
  )
}
