import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useServerNow } from "../lib/hooks";
import type {
  DrinkRow,
  EventRow,
  MemberRow,
  NightRow,
  PointsRow,
  StrafeRow,
} from "../lib/types";
import { ABSTIMMUNG, REGEL, TV_STAGE } from "../shared/content/events";
import {
  STADGAR,
  TV_EMPTY,
  TV_ENDED,
  TV_JOIN,
  TV_STRAFEN,
  TV_TOTALS,
} from "../shared/content/tv";
import { BRAND } from "../shared/content/ui";
import { computeAchievements } from "../shared/game/achievements";
import { strafeTally, sumTallies, tallyDrinks } from "../shared/game/drinks";
import { stageEvent } from "../shared/game/schedule";
import { fmtClock, fmtLitres } from "../shared/game/format";
import {
  Crest,
  QrCode,
  RollingNumber,
  Shield,
  toast,
} from "../ui";
import { AchievementPopup } from "./AchievementPopup";
import { play } from "./audio";
import { EventStage } from "./EventStage";
import { MemberBars } from "./MemberBars";
import { PaceTimeline } from "./PaceTimeline";
import { StrafeRegister } from "./StrafeRegister";
import { fmtTime } from "./time";

/** How long each statute holds the header. On server time, so every TV shows the same one. */
const STATUTE_MS = 30_000;

interface DashboardProps {
  night: NightRow;
  members: readonly MemberRow[];
  drinks: readonly DrinkRow[];
  strafen: readonly StrafeRow[];
  points: readonly PointsRow[];
  events: readonly EventRow[];
}

function Total({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="sign flex flex-1 items-baseline justify-center gap-4 px-6 py-4">
      <span className="text-tv-lg leading-none font-black text-koenig tabular-nums">
        {children}
      </span>
      <span className="text-2xl font-bold text-weste-dim">{label}</span>
    </div>
  );
}

/** Announces each Strafe that arrives after the dashboard loaded. */
function useStrafeToasts(
  strafen: readonly StrafeRow[],
  members: readonly MemberRow[],
) {
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    const first = seen.current === null;
    const known = (seen.current ??= new Set());
    for (const s of strafen) {
      if (known.has(s.id)) continue;
      known.add(s.id);
      const name = members.find((m) => m.id === s.memberId)?.name;
      if (first || !name) continue;
      toast({
        text: TV_STRAFEN.toast(name, s.reason),
        tone: "error",
        ms: 8000,
      });
      // A Strafe from an event already had its trombone, with the verdict.
      if (s.eventId === null) play("strafe");
    }
  }, [strafen, members]);
}

/** One line across the dashboard: the rule in force, or a nudge to start the night. */
function Strip({
  label,
  clock,
  children,
}: {
  label?: string;
  clock?: string;
  children: ReactNode;
}) {
  return (
    <div className="sign flex shrink-0 animate-thud items-baseline gap-6 px-8 py-4">
      {label && (
        <span className="text-xl font-bold tracking-[0.18em] text-messing-deep uppercase">
          {label}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate font-display text-tv-md leading-none font-bold text-koenig">
        {children}
      </span>
      {clock && (
        <span className="text-tv-md leading-none font-black tabular-nums">
          {clock}
        </span>
      )}
    </div>
  );
}

export function Dashboard({
  night,
  members,
  drinks,
  strafen,
  points,
  events,
}: DashboardProps) {
  const now = useServerNow(500);
  useStrafeToasts(strafen, members);

  const tallies = useMemo(
    () =>
      tallyDrinks(
        drinks,
        members.map((m) => m.id),
      ),
    [drinks, members],
  );
  const total = useMemo(() => sumTallies(tallies), [tallies]);
  const strafeCounts = useMemo(() => strafeTally(strafen), [strafen]);
  const pointCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const p of points) out[p.memberId] = (out[p.memberId] ?? 0) + p.amount;
    return out;
  }, [points]);
  const achievements = useMemo(
    () =>
      computeAchievements({
        memberIds: members.map((m) => m.id),
        drinks,
        strafen,
        points,
        events,
      }),
    [members, drinks, strafen, points, events],
  );
  const ended = night.status === "ended";
  const joinUrl = window.location.origin;
  const rules = events.filter(
    (e) => e.status === "live" && e.payload.kind === "regel",
  );
  // The title from the latest vote that had a winner, held until the next one.
  const titled = events
    .flatMap((e) =>
      e.payload.kind === "abstimmung" &&
      e.result?.kind === "abstimmung" &&
      e.result.winners.length > 0
        ? [{ id: e.id, title: e.payload.title, winners: e.result.winners }]
        : [],
    )
    .at(-1);
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "?";

  return (
    <main className="relative flex h-full flex-col gap-6 overflow-hidden px-10 pb-8">
      {!ended && <EventStage events={events} members={members} now={now} />}
      {!ended && (
        <AchievementPopup
          achievements={achievements}
          members={members}
          held={stageEvent(events, now) !== undefined}
        />
      )}
      {/* The tablecloth trim: the one loud band on the screen. */}
      <div className="rauten-band -mx-10 shrink-0 text-[2.75rem]" />
      <header className="flex items-center gap-8">
        <Shield className="h-32 w-auto shrink-0" />
        <h1 className="font-display text-tv-xl leading-none font-bold text-koenig">
          {BRAND.name}
        </h1>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="truncate font-display text-tv-md leading-none font-bold">
            {ended ? TV_ENDED : BRAND.club}
          </p>
          <p className="truncate text-xl font-bold text-weste-dim">
            <span className="tracking-[0.18em] text-messing-deep uppercase">
              {BRAND.motto}
            </span>
            {!ended && <> · {STADGAR[Math.floor(now / STATUTE_MS) % STADGAR.length]}</>}
          </p>
        </div>
        <p className="text-tv-lg leading-none font-black text-koenig tabular-nums">
          {fmtTime(now)}
        </p>
        {members.length > 0 && !ended && (
          <div className="flex items-center gap-4">
            <p className="font-display text-tv-md leading-none font-bold text-weste-dim">
              {TV_JOIN.corner}
            </p>
            <QrCode
              value={joinUrl}
              label={TV_JOIN.qrLabel}
              className="size-28 shrink-0 border-2 border-koenig"
            />
          </div>
        )}
      </header>

      {members.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center gap-16">
          <Crest size="tv" className="shrink-0" />
          <div className="flex max-w-2xl flex-col gap-6">
            <p className="text-tv-sm font-bold text-strafe">{TV_EMPTY.title}</p>
            <h2 className="font-display text-tv-xl leading-none font-bold text-koenig">
              {TV_JOIN.title}
            </h2>
            <p className="text-tv-md text-weste">{TV_EMPTY.text}</p>
            <p className="text-tv-sm text-weste-dim">{TV_JOIN.text}</p>
          </div>
          <div className="sign shrink-0 p-5">
            <QrCode
              value={joinUrl}
              label={TV_JOIN.qrLabel}
              className="size-[26rem]"
            />
          </div>
        </div>
      ) : (
        <>
          {night.status === "idle" && <Strip>{TV_STAGE.idle}</Strip>}
          {rules.map((e) => (
            <Strip
              key={e.id}
              label={REGEL.banner}
              clock={fmtClock((e.endsAt - now) / 1000)}
            >
              {e.payload.kind === "regel" && e.payload.rule}
            </Strip>
          ))}
          {titled && !ended && (
            <Strip key={titled.id} label={ABSTIMMUNG.banner}>
              {ABSTIMMUNG.holder(
                titled.title,
                titled.winners.map(nameOf).join(", "),
              )}
            </Strip>
          )}
          <div className="grid min-h-0 flex-1 grid-cols-[3fr_2fr] gap-6">
            <MemberBars
              members={members}
              tallies={tallies}
              strafeCounts={strafeCounts}
              pointCounts={pointCounts}
            />
            <div className="grid min-h-0 grid-rows-2 gap-6">
              <PaceTimeline
                night={night}
                members={members}
                drinks={drinks}
                now={now}
              />
              <StrafeRegister members={members} strafen={strafen} />
            </div>
          </div>
          <footer className="flex gap-6">
            <Total label={TV_TOTALS.litres}>{fmtLitres(total.cl)}</Total>
            <Total label={TV_TOTALS.drinks}>
              <RollingNumber value={total.drinks} />
            </Total>
            <Total label={TV_TOTALS.wasser}>
              <RollingNumber value={total.counts.wasser} />
            </Total>
            <Total label={TV_TOTALS.strafen}>
              <RollingNumber value={strafen.length} />
            </Total>
          </footer>
        </>
      )}
    </main>
  );
}
