import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useResponses, useServerClock } from '../../lib/hooks'
import { DUELL } from '../../shared/content/events'
import type { EventPayload } from '../../shared/game/types'
import { play } from '../audio'
import { Chip, type StageProps } from './Chip'

type DuellProps = StageProps & { payload: Extract<EventPayload, { kind: 'duell' }> }

/** A Duell on the TV: the two names, then the draw (with a crack), then who was faster. */
export function DuellStage({ event, payload, members }: DuellProps) {
  const responses = useResponses(event.id, { pollMs: 3000 })
  const { now } = useServerClock()
  const member = (id: string) => members.find((m) => m.id === id)
  const a = member(payload.a)
  const b = member(payload.b)
  const live = event.status === 'live'

  const drawAt = event.startedAt + payload.drawAfterMs
  const [drawn, setDrawn] = useState(false)
  useEffect(() => {
    if (!live) return
    const wait = drawAt - now()
    const timer = setTimeout(
      () => {
        setDrawn(true)
        // A TV that joins after the draw shows it without the sound.
        if (wait > 0) play('draw')
      },
      Math.max(0, wait),
    )
    return () => clearTimeout(timer)
  }, [live, drawAt, now])

  const names = (
    <p className="flex flex-wrap items-baseline justify-center gap-x-8 font-display text-[8rem] leading-none font-bold">
      <span className="inline-block animate-from-left" style={{ color: a?.colour }}>
        {a?.name ?? '?'}
      </span>
      <span className="font-body text-tv-md font-bold text-weste-dim">{DUELL.versus}</span>
      <span className="inline-block animate-from-right" style={{ color: b?.colour }}>
        {b?.name ?? '?'}
      </span>
    </p>
  )

  const result = event.result?.kind === 'duell' ? event.result : null
  if (result) {
    const winner = result.winner === null ? undefined : member(result.winner)
    const loser = result.loser === null ? undefined : member(result.loser)
    return (
      <>
        <h2 className="font-display text-[9rem] leading-none font-bold text-koenig">{DUELL.resultTitle}</h2>
        {winner && loser ? (
          <>
            <p className="text-tv-lg font-bold">{DUELL.winner(winner.name, result.reactions[winner.id])}</p>
            <p className="animate-stamp text-tv-lg font-black text-strafe">{DUELL.strafe(loser.name)}</p>
          </>
        ) : (
          <>
            {names}
            <p className="animate-stamp text-tv-lg font-black text-strafe">{DUELL.nobody}</p>
          </>
        )}
      </>
    )
  }

  const picked = (responses.data ?? []).filter((r) => r.payload.kind === 'duell_pick').map((r) => r.memberId)
  const bystanders = members.filter((m) => m.id !== payload.a && m.id !== payload.b)
  return (
    <>
      <h2 className="font-display text-[9rem] leading-none font-bold text-koenig">{DUELL.title}</h2>
      {names}
      {drawn ? (
        <>
          <p className="animate-slam font-display text-[14rem] leading-none font-bold">{DUELL.draw}</p>
          {/* The whole screen blinks, for the duellist who is looking at his glass. In the body: the sign clips its own. */}
          {createPortal(<div className="pointer-events-none fixed inset-0 z-30 animate-flash bg-strafe" />, document.body)}
        </>
      ) : (
        <>
          <p className="text-tv-md font-bold">{DUELL.tvReady}</p>
          <ul className="flex flex-wrap justify-center gap-4">
            {bystanders.map((m) => (
              <Chip key={m.id} member={m} on={picked.includes(m.id)} />
            ))}
          </ul>
        </>
      )}
    </>
  )
}
