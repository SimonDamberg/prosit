import type { MemberRow } from '../lib/types'
import { AWARDS, MY_AWARDS } from '../shared/content/awards'
import { awardsOf, awardValue, type Award } from '../shared/game/awards'

interface MyAwardsProps {
  me: MemberRow
  members: readonly MemberRow[]
  awards: readonly Award[]
}

/** The ended night: what this member was honoured with at the ceremony on the TV. */
export function MyAwards({ me, members, awards }: MyAwardsProps) {
  const mine = awardsOf(awards, me.id)
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? '?'

  return (
    <section className="flex flex-col gap-3">
      <h2 className="label-rule text-base">{MY_AWARDS.title}</h2>
      {mine.length === 0 ? (
        <p className="text-base text-weste-dim">{MY_AWARDS.none}</p>
      ) : (
        <ul className="stagger flex flex-col gap-2">
          {mine.map((award) => {
            const copy = AWARDS[award.key]
            const others = award.memberIds.filter((id) => id !== me.id)
            return (
              <li key={award.key} className="rounded-md border-l-4 border-messing bg-paper-deep px-4 py-3">
                <p className="font-display text-3xl leading-none font-bold text-koenig">{copy.title}</p>
                <p className="mt-1 text-base font-bold tabular-nums">{copy.value(awardValue(award))}</p>
                <p className="text-sm text-weste-dim">{copy.citation}</p>
                {others.length > 0 && <p className="text-sm text-weste-dim">{MY_AWARDS.shared(others.map(nameOf).join(', '))}</p>}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
