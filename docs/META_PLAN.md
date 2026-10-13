# Prosit!: meta-plan

## Context

Simon and four friends run a gentlemen's club with yearly meetings and traditions. This
weekend (17-18 Oct 2026) is their Oktoberfest. After the Rally75 party app (`../natcasino`)
Simon wants a new shared webapp for the evening: **Prosit!**, a companion that runs all night.

- **Phone** (`/`): each member logs drinks, answers events, hands out Strafen.
- **TV** (`/tv`): live dashboard, and the stage for every event. Pure output.
- **No game master.** The app paces itself and all five play as equals.
- **Shared backend:** Supabase (Postgres + Realtime + RPCs).

The work is split into stages, each run by a fresh agent session. This file is the contract
between those sessions.

## Decisions (settled with Simon, treat as fixed)

| Topic | Decision |
|---|---|
| Concept | All-night companion: drink log, TV dashboard, random events. No scheduled tournament. |
| Players | Five club members. Join by QR on the TV, name plus colour. `{memberId, token}` in localStorage. |
| Control | No GM, no password. Any member can start the night, change the event interval, end the night. |
| Devices | TV at `/tv` (landscape, readable across a room, nothing to tap after the start). Phones at `/` (portrait). |
| Language | Swedish with over-the-top fake German (Prosit, Maß, Strafe, Herr Präsident). All user-facing text, including errors. No em dashes. |
| Club | **Svarta Västarna**, motto "Natura Statera". |
| Look | Traditional Bavarian white and blue, light theme. Must not resemble Rally75. |
| Humour | The club as a pompous, arch-conservative Herrenklubb: mock-solemn statutes, inflated titles, outrage at modernity (oat milk, alcohol-free beer, e-scooters), "så har vi alltid gjort". Bavarian beer-hall kitsch. No Nazi-themed content. |
| Alarm | The TV announces events with sound and visuals. Phones only respond (no push notifications). |
| Audio | TV only, synthesized with Web Audio (no audio files). One tap on the TV ("Starta kvällen") unlocks it. |
| Events | PROSIT!, Duell, Regel, Abstimmung, Schätzfrage, Trinkspruch (see below). Every 8-15 min, adjustable. |
| Penalties | A **Strafe** is a counted penalty shown on the TV. What it costs in real life is the club's business. |
| Drinks | Öl, Maß, Schnaps, Wasser. Self-reported, with undo. Wasser counts and earns its own award. |
| Finale | "Avsluta kvällen" runs an awards ceremony on the TV, computed from the night's log. |
| Trust | Five friends. RPCs check the member token and nothing more. |
| Network | Required. Clear "Keine Verbindung" states with auto-retry. No offline mode. |
| Stack | Vite + React + TypeScript + Tailwind v4 + React Router + Vitest + `@supabase/supabase-js`, on Vercel. Same as Rally75. |
| Code | New repo, pieces copied from `../natcasino` (never imported across repos). |
| Timeline | Party on the weekend of 17 Oct. Stages 1-3 are the must-haves; each stage ends deployable. |

## Events

| Event | What happens |
|---|---|
| **PROSIT!** | TV blares and flashes. Everyone toasts, then taps "Prost!". The last one, and anyone who misses 60 s, gets a Strafe. |
| **Duell** | Two random members. Reaction game on their phones (wait for "ZIEH!", tap first; an early tap loses). The other three pick a winner for points. The loser gets a Strafe. |
| **Regel** | A rule from a pool holds for 10 min. Anyone can hand out a Strafe for a breach. |
| **Abstimmung** | "Vem i klubben ...?" vote. The winner holds the title on the TV until the next vote. |
| **Schätzfrage** | Estimate question. Closest wins points, furthest gets a Strafe. |
| **Trinkspruch** | One random member gives a 30 s toast speech. The others rate it 1-5 Maß. |

## Architecture

### Repo layout (target)

```
/                     Vite app root
  CLAUDE.md           conventions for every agent (Stage 1)
  docs/META_PLAN.md   this plan
  docs/STATUS.md      handoff log, appended at the end of every stage
  supabase/migrations/*.sql
  scripts/bots.ts     five fake members for end-to-end checks
  src/
    shared/content/   Swedish/German copy and pools (rules, votes, questions, awards). Data only.
    shared/game/      Pure logic: rng, schedule, resolve, achievements, awards, types.
    lib/              Supabase client, typed RPC wrappers, realtime hooks, clock, identity, useEngine.
    ui/               Design-system components shared by phone and TV.
    client/           Phone app, route "/".
    tv/               TV app, route "/tv".
  vercel.json         rewrite all paths -> /index.html
```

### GM-less engine: logic in pure TS, database as an idempotent referee

- `shared/game/schedule.ts`: event N's kind, payload and start time, from
  `createRng(nightSeed + N)`, the member list and the interval. Deterministic.
- `shared/game/resolve.ts`: event + responses -> result, points and Strafen. Deterministic.
- Every connected client runs `useEngine`, ticking every few seconds on **server time**. When
  event N is due it calls `spawn_event`; when an event is past `ends_at` or everyone has
  answered, it calls `resolve_event`.
- Several clients race on purpose. The DB makes that safe: `unique(night_id, seq)` on events,
  and `resolve_event` applies only while `status = 'live'`. Every client computes the same
  answer, so the first write wins and the rest are no-ops.

### Data model (Supabase, RLS on, anon may SELECT, writes only through RPCs)

- `night` singleton: `status (idle|live|ended), seed, started_at, interval_min, ended_at`.
- `members`: `id, name, colour, created_at`. `member_secrets`: `member_id, token` (no client access).
- `drinks`: `id, member_id, kind, at`.
- `events`: `id, seq, kind, payload jsonb, started_at, ends_at, status (live|done), result jsonb`.
- `responses`: `event_id, member_id, payload jsonb, at`, unique per member and event.
- `strafen`: `id, member_id, given_by, reason, event_id, at`.
- `points`: `id, member_id, amount, reason, event_id, at`.

Realtime publication: everything except `member_secrets`.

### RPC contract (SECURITY DEFINER, the only write path)

`join(name, colour) -> {id, token}`, `log_drink`, `undo_drink`, `start_night`, `set_interval`,
`spawn_event(seq, kind, payload, ends_at)`, `respond(event_id, payload)`,
`resolve_event(event_id, result, points[], strafen[])`, `give_strafe(target, reason)`,
`end_night`, `reset_night`, `server_now`. All but `join` and `server_now` take
`member_id, token`.

### Reuse from `../natcasino` (copy, then trim)

- `src/lib/`: `supabase.ts`, `client.ts`, `connection.ts`, `clock.ts`, `errors.ts`,
  `applyChange` from `realtime.ts`, the subscription pattern in `hooks.ts`, the external
  store in `identity.ts` (keys renamed to `prosit.*`).
- `src/shared/game/`: `rng.ts` (`createRng`, `randomSeed`), `countdown.ts`.
- `src/ui/`: `Button`, `Modal`, `Toaster`, `QrCode`, `ConnectionBadge`, `RollingNumber`,
  `LoadingScreen`, `StatusBanner`.
- `src/gm/useWakeLock.ts` for the TV. `scripts/smoke.ts` / `load.ts` as the template for bots.
- Config: `vite.config.ts`, `vercel.json`, tsconfigs, `eslint.config.js`, `.env.example`.
- The em dash test and the `shared` purity rules.

Not reused: odds, sim, economy, coupons, shop, both casino brands, the GM password gate.

## Stages

Each stage: one fresh agent session. Start prompt: *"Read CLAUDE.md, docs/META_PLAN.md and
docs/STATUS.md, then plan and execute Stage N."* The agent writes a high-level plan for its
stage first, gets it approved, then builds. End of every stage: `npm run build`, `npm test`
and `npm run lint` pass, `docs/STATUS.md` gets a section (done, deviations, open issues,
manual steps for Simon), commit, stop.

### Stage 1: Foundation
- `git init`, Vite React TS, Tailwind v4, React Router (`/` and `/tv` placeholders), Vitest,
  ESLint, `vercel.json`, `.env.example`.
- Copy the reusable pieces listed above; strip Rally75 specifics. Neutral placeholder theme.
- `CLAUDE.md`: language and humour rules, no em dash, audio on TV only, folder rules,
  "shared/game is pure, deterministic and tested".
- `shared/game/types.ts` (event kinds, payload and result shapes) and `rng` with tests; em
  dash scan test.
- Simon: create the GitHub repo and import it to Vercel.

### Stage 2: Backend + drink log + TV dashboard
- Simon: create a Supabase project (or approve reusing the Rally75 one), fill `.env.local`
  and the Vercel env.
- One migration: tables, RLS, grants, realtime publication, all RPCs.
- `src/lib/`: typed RPC wrappers and hooks (`useNight`, `useMembers`, `useDrinks`,
  `useEvents`, `useStrafen`, `usePoints`, `useServerClock`).
- Phone: join flow, "+1" drink buttons with undo, own stats, give Strafe.
- TV: join QR, bar per member, pace timeline, totals, Strafe tally.
- `scripts/bots.ts`: five members join and log drinks.
- Usable on Saturday even if nothing after this ships.

### Stage 3: Event engine + PROSIT! + Regel
- `schedule.ts`, `resolve.ts`, `useEngine`, with tests (determinism, no repeat kinds back to
  back, fair member selection).
- "Starta kvällen", interval control, event takeover on TV and phone, countdowns on server time.
- PROSIT! and Regel end to end. Dev-only "trigger next now" button.
- Bots answer events; assert each `seq` spawns once and resolves once with five engines racing.

### Stage 4: Remaining events
- Duell (reaction game plus side picks), Abstimmung, Schätzfrage, Trinkspruch.
- Content pools in `shared/content/` (rules, votes, questions), in the house humour.
- Simon: optional inside-joke material for the pools.

### Stage 5: Sound + takeover animations
- The design system (white and blue, Rauten, blackletter, crest) was done after Stage 2; see
  `docs/STATUS.md` and the Design system section of `CLAUDE.md`. Build on it, do not replace it.
- Event takeover animations; Web Audio brass sting and bell on the TV.
- Dev-only `/styleguide` route.

### Stage 6: Achievements, finale, deploy, dress rehearsal
- `achievements.ts` and `awards.ts` with tests; pop-ups on the TV; the finale ceremony.
- Production env, PWA manifest and icons, wake lock on the TV, `reset_night`.
- Rehearsal with real phones and the TV. Party-day checklist (wake the Supabase project,
  reset the night, unlock audio).

If time runs short: Stage 5 can shrink to a theme pass, and Stage 6's achievements are optional.
The finale and the deploy checklist are not.

## Verification (per stage)

- Stage 1: `npm test`, `npm run lint`, `npm run build`; `npm run dev` shows both routes.
- Stage 2: `npm run bots` against local Supabase (`npx supabase start`); anon cannot write
  tables or read `member_secrets`; phone window and TV window update each other live.
- Stage 3: schedule and resolve tests; bots with a 30 s interval prove single spawn and
  single resolve; manual run of PROSIT! and Regel across `/tv` plus two phone windows.
- Stage 4: resolve tests per event kind; manual run of each event with the dev trigger.
- Stage 5: screenshots at 390 px portrait and 1920x1080; audio unlock on a real TV browser.
- Stage 6: awards tests; full night at a 1 min interval with bots, ending in the finale;
  join from a real iPhone on the deployed URL.

