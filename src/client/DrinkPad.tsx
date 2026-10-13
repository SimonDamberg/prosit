import { useState } from 'react'
import { getApi } from '../lib/supabase'
import type { Identity } from '../lib/types'
import { DRINK_HINTS, DRINK_ICONS, DRINK_LABELS, DRINK_LOGGED } from '../shared/content/drinks'
import { HOME } from '../shared/content/phone'
import type { Tally } from '../shared/game/drinks'
import { DRINK_KINDS, type DrinkKind } from '../shared/game/types'
import { Button, toast } from '../ui'
import { reportError } from './report'

/** Four "+1" buttons and the undo. The counts come back through Realtime, not from the tap. */
export function DrinkPad({ identity, tally }: { identity: Identity; tally: Tally }) {
  const [pending, setPending] = useState<DrinkKind | 'undo' | null>(null)
  const logged = DRINK_KINDS.reduce((n, kind) => n + tally.counts[kind], 0)

  const log = async (kind: DrinkKind) => {
    setPending(kind)
    try {
      await getApi().logDrink(identity, kind)
      toast({ text: DRINK_LOGGED[kind], tone: kind === 'wasser' ? 'info' : 'win', ms: 2500 })
    } catch (err) {
      reportError(err)
    } finally {
      setPending(null)
    }
  }

  const undo = async () => {
    setPending('undo')
    try {
      await getApi().undoDrink(identity)
      toast({ text: HOME.undone, ms: 2500 })
    } catch (err) {
      reportError(err)
    } finally {
      setPending(null)
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="label-rule text-base">{HOME.drinksTitle}</h2>
      <div className="grid grid-cols-2 gap-3">
        {DRINK_KINDS.map((kind) => (
          <Button
            key={kind}
            variant={kind === 'wasser' ? 'quiet' : 'primary'}
            disabled={pending !== null}
            onClick={() => log(kind)}
            className="h-32 flex-col px-2"
          >
            <span className="flex items-center gap-2 text-4xl">
              <span aria-hidden>{DRINK_ICONS[kind]}</span>
              {DRINK_LABELS[kind]}
            </span>
            <span className="font-body text-sm font-semibold opacity-80">
              {DRINK_HINTS[kind]}
            </span>
            <span className="font-body text-lg font-black tabular-nums">
              {tally.counts[kind]}
            </span>
          </Button>
        ))}
      </div>
      <Button variant="ghost" block disabled={logged === 0 || pending !== null} onClick={undo}>
        {HOME.undo}
      </Button>
    </section>
  )
}
