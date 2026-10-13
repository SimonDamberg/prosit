import { useMemo, useState } from 'react'
import type { ConnectionStatus } from '../lib/connection'
import { useDrinks, useServerNow, useStrafen } from '../lib/hooks'
import type { EventRow, Identity, MemberRow, NightRow } from '../lib/types'
import { DRINK_ICONS, DRINK_LABELS } from '../shared/content/drinks'
import { ENDED, HOME, PHONE_LOADING } from '../shared/content/phone'
import { ruleBreach } from '../shared/content/rules'
import { BRAND } from '../shared/content/ui'
import { placeOf, tallyDrinks } from '../shared/game/drinks'
import { fmtLitres } from '../shared/game/format'
import { DRINK_KINDS, type EventKind } from '../shared/game/types'
import { Button, ConnectionBadge, LoadingScreen } from '../ui'
import { DrinkPad } from './DrinkPad'
import { EventTakeover } from './EventTakeover'
import { NightControls } from './NightControls'
import { RuleCard } from './RuleCard'
import { StrafeSheet } from './StrafeSheet'

interface HomeScreenProps {
  me: MemberRow
  identity: Identity
  members: readonly MemberRow[]
  night: NightRow
  events: readonly EventRow[]
  connection: ConnectionStatus
  /** Dev only: open the next event now, as this kind if given. */
  onTrigger: (kind?: EventKind) => Promise<void>
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-md bg-paper-deep px-2 py-3 text-center">
      <span className="text-2xl leading-none font-black text-koenig tabular-nums">{value}</span>
      <span className="text-xs font-bold text-weste-dim">{label}</span>
    </div>
  )
}

/** The member's own page: log drinks, answer events, see the protocol, hand out Strafen. */
export function HomeScreen({ me, identity, members, night, events, connection, onTrigger }: HomeScreenProps) {
  const drinks = useDrinks()
  const strafen = useStrafen()
  const now = useServerNow(500)
  // null: closed. `n` remounts the sheet per opening, so it starts from that opening's reason.
  const [strafe, setStrafe] = useState<{ n: number; reason: string | null } | null>(null)
  const openStrafe = (reason: string | null) => setStrafe((s) => ({ n: (s?.n ?? 0) + 1, reason }))
  const ended = night.status === 'ended'

  const tallies = useMemo(
    () => (drinks.data ? tallyDrinks(drinks.data, members.map((m) => m.id)) : undefined),
    [drinks.data, members],
  )
  const mine = tallies?.find((t) => t.memberId === me.id)

  if (!tallies || !mine || !strafen.data) return <LoadingScreen label={PHONE_LOADING.data} />

  const myStrafen = strafen.data.filter((s) => s.memberId === me.id).reverse()
  const nameOf = (id: string | null) => members.find((m) => m.id === id)?.name ?? null

  const rules = events.flatMap((e) =>
    e.status === 'live' && e.payload.kind === 'regel' ? [{ id: e.id, rule: e.payload.rule, endsAt: e.endsAt }] : [],
  )

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 pb-24">
      <div className="rauten-band -mx-4 shrink-0 text-[1.75rem]" />
      <header className="flex items-center gap-3">
        <span className="size-11 shrink-0 rounded-full ring-2 ring-weste/30" style={{ backgroundColor: me.colour }} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-weste-dim">
            {BRAND.club} · {HOME.greeting}
          </p>
          <h1 className="truncate font-display text-5xl leading-none font-bold text-koenig">{me.name}</h1>
        </div>
        <ConnectionBadge status={connection} />
      </header>

      {ended ? (
        <section className="sign flex flex-col items-center px-5 py-6 text-center">
          <h2 className="font-display text-5xl leading-none font-bold text-koenig">{ENDED.title}</h2>
          <p className="mt-2 text-base text-weste-dim">{ENDED.text}</p>
          <p className="mt-4 text-sm font-bold tracking-[0.18em] text-messing-deep uppercase">{BRAND.motto}</p>
        </section>
      ) : (
        <>
          {night.status === 'idle' && <NightControls night={night} identity={identity} onTrigger={onTrigger} />}
          {rules.map((r) => (
            <RuleCard key={r.id} rule={r.rule} endsAt={r.endsAt} now={now} onReport={() => openStrafe(ruleBreach(r.rule))} />
          ))}
          <DrinkPad identity={identity} tally={mine} />
          <Button variant="danger" size="lg" block onClick={() => openStrafe(null)}>
            {HOME.strafeButton}
          </Button>
        </>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="label-rule text-base">{HOME.statsTitle}</h2>
        <div className="grid grid-cols-3 gap-2">
          <Stat label={HOME.litresLabel} value={`${fmtLitres(mine.cl, 2)} ${HOME.litresShort}`} />
          <Stat
            label={HOME.place}
            value={mine.cl > 0 ? HOME.placeOf(placeOf(tallies, me.id), members.length) : HOME.noPlace}
          />
          <Stat label={HOME.strafen} value={String(myStrafen.length)} />
        </div>
        <p className="flex justify-between rounded-md bg-paper-deep px-4 py-3 text-base font-bold tabular-nums">
          {DRINK_KINDS.map((kind) => (
            <span key={kind} aria-label={`${DRINK_LABELS[kind]}: ${mine.counts[kind]}`}>
              <span aria-hidden>{DRINK_ICONS[kind]}</span> {mine.counts[kind]}
            </span>
          ))}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="label-rule text-base">{HOME.myStrafenTitle}</h2>
        {myStrafen.length === 0 ? (
          <p className="text-base text-weste-dim">{HOME.noStrafen}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {myStrafen.map((s) => (
              <li key={s.id} className="rounded-md border-l-4 border-strafe bg-paper-deep px-4 py-2.5">
                <p className="text-base font-bold">{s.reason}</p>
                <p className="text-sm text-weste-dim">
                  {s.givenBy ? HOME.strafeBy(nameOf(s.givenBy) ?? '?') : HOME.strafeByClub}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {night.status === 'live' && <NightControls night={night} identity={identity} onTrigger={onTrigger} />}

      {strafe && (
        <StrafeSheet
          key={strafe.n}
          open
          onClose={() => setStrafe(null)}
          identity={identity}
          members={members}
          extraReasons={rules.map((r) => ruleBreach(r.rule))}
          initialReason={strafe.reason}
        />
      )}
      {!ended && <EventTakeover events={events} identity={identity} members={members} now={now} />}
    </main>
  )
}
