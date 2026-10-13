import { REGEL } from '../shared/content/events'
import { fmtClock } from '../shared/game/format'
import { Button } from '../ui'

interface RuleCardProps {
  rule: string
  endsAt: number
  /** Server time. */
  now: number
  onReport: () => void
}

/** The rule in force, with a shortcut to a Strafe for breaking it. */
export function RuleCard({ rule, endsAt, now, onReport }: RuleCardProps) {
  return (
    <section className="sign flex flex-col gap-3 px-5 py-5">
      <p className="flex items-baseline justify-between gap-3 text-sm font-bold text-messing-deep">
        <span className="tracking-[0.18em] uppercase">{REGEL.kicker}</span>
        <span className="tabular-nums">{REGEL.holds(fmtClock((endsAt - now) / 1000))}</span>
      </p>
      <h2 className="font-display text-4xl leading-none font-bold text-koenig">{rule}</h2>
      <p className="text-base text-weste-dim">{REGEL.hint}</p>
      <Button variant="danger" block onClick={onReport}>
        {REGEL.report}
      </Button>
    </section>
  )
}
