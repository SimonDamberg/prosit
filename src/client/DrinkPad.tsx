import { useState } from 'react'
import { getApi } from '../lib/supabase'
import type { DrinkRow, Identity } from '../lib/types'
import { DRINK_HINTS, DRINK_ICONS, DRINK_LABELS, DRINK_LOGGED, WASSER_NUDGE } from '../shared/content/drinks'
import { HOME } from '../shared/content/phone'
import { wasserDue, type Tally } from '../shared/game/drinks'
import { DRINK_KINDS, type DrinkKind } from '../shared/game/types'
import { Button, toast } from '../ui'
import { reportError } from './report'

interface DrinkPadProps {
  identity: Identity
  tally: Tally
  /** The member's drinks so far, for the physician's Wasser nudge. */
  drinks: readonly DrinkRow[]
}

/** Four "+1" buttons and the undo. The counts come back through Realtime, not from the tap. */
export function DrinkPad({ identity, tally, drinks }: DrinkPadProps) {
  const [pending, setPending] = useState<DrinkKind | 'undo' | null>(null)
  const logged = DRINK_KINDS.reduce((n, kind) => n + tally.counts[kind], 0)

  const log = async (kind: DrinkKind) => {
    setPending(kind)
    try {
      const row = await getApi().logDrink(identity, kind)
      if (kind === 'mass' && wasserDue([...drinks.filter((d) => d.id !== row.id), row], identity.memberId)) {
        toast({ text: WASSER_NUDGE[tally.counts.mass % WASSER_NUDGE.length], tone: 'info', ms: 5000 })
      } else {
        const lines = DRINK_LOGGED[kind]
        toast({ text: lines[tally.counts[kind] % lines.length], tone: kind === 'wasser' ? 'info' : 'win', ms: 2500 })
      }
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
