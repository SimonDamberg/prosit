import type { EventRow, Identity, MemberRow } from '../lib/types'
import { stageEvent } from '../shared/game/schedule'
import { AbstimmungTakeover } from './AbstimmungTakeover'
import { DuellTakeover } from './DuellTakeover'
import { PrositTakeover } from './PrositTakeover'
import { SchatzfrageTakeover } from './SchatzfrageTakeover'
import { TrinkspruchTakeover } from './TrinkspruchTakeover'

interface EventTakeoverProps {
  events: readonly EventRow[]
  identity: Identity
  members: readonly MemberRow[]
  /** Server time. */
  now: number
}

/** The event that owns the phone right now, live or showing its result. Nothing in between events. */
export function EventTakeover({ events, identity, members, now }: EventTakeoverProps) {
  const event = stageEvent(events, now)
  if (!event) return null
  const props = { event, identity, members, now }
  const { payload } = event
  switch (payload.kind) {
    case 'prosit':
      return <PrositTakeover key={event.id} {...props} />
    case 'duell':
      return <DuellTakeover key={event.id} {...props} payload={payload} />
    case 'abstimmung':
      return <AbstimmungTakeover key={event.id} {...props} payload={payload} />
    case 'schatzfrage':
      return <SchatzfrageTakeover key={event.id} {...props} payload={payload} />
    case 'trinkspruch':
      return <TrinkspruchTakeover key={event.id} {...props} payload={payload} />
    default:
      return null
  }
}
