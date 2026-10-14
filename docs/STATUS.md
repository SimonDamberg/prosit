# Prosit!: status log

Every stage agent appends a section here when it finishes: what was done, deviations from
`docs/META_PLAN.md`, open issues, and manual steps Simon must take.

## Stage 0: meta-plan (done, 2026-10-13)

- Concept chosen with Simon from five proposals: the all-night companion (drink log, TV
  dashboard, random events), TV plus phones, no game master, Swedish with fake German.
- Requirements recorded in `docs/META_PLAN.md` (the Decisions table is fixed).
- Humour settled: pompous conservative Herrenklubb and Bavarian kitsch. No Nazi-themed content.

## Stage 1: foundation (done, 2026-10-13)

**Done**

- New repo at `Hobby/prosit`, `git init` (branch `main`), `CLAUDE.md` written.
- Vite 8 + React 19 + TS 6 + Tailwind 4 + React Router 7 + Vitest 4 + ESLint 10, `vercel.json`
  SPA rewrite, `.env.example`.
- Routes: `/` (phone placeholder) and `/tv` (TV placeholder with a join QR to the site origin,
  lazy-loaded, wake lock on). Unknown paths redirect to `/`.
- Copied from natcasino and stripped of Rally75 specifics:
  - `src/lib/`: `client`, `supabase` (`getSupabase` only), `connection`, `clock`, `errors`
    (`PrositError`, `toPrositError`), `realtime` (`applyChange` only), `identity`
    (`{memberId, token}` under `prosit.identity`), `hooks` (`useConnection`, `useIdentity`).
  - `src/shared/game/`: `rng`, plus `format` (`fmtInt`, `fmtClock`).
  - `src/ui/`: `Button`, `Modal`, `Toaster` + `toast`, `QrCode`, `ConnectionBadge`,
    `RollingNumber`, `LoadingScreen`, `cx`.
  - `src/tv/useWakeLock.ts`.
- New: `src/shared/game/types.ts` with `DrinkKind`, `EventKind`, and the `EventPayload`,
  `EventResponse`, `EventResult` and `Resolution` shapes that the jsonb columns will hold.
- New: `src/shared/content/ui.ts` and `errors.ts` (three client-side codes so far).
- 25 tests: rng, clock, errors, applyChange, toast store, format, em dash scan over `src/`.
- Verified: `npm test`, `npm run lint`, `npm run build` pass. Headless Chromium renders `/` at
  390x844 and `/tv` at 1920x1080 with both fonts and the QR code.

**Deviations from META_PLAN**

- `countdown.ts` was not copied: its logic is the Rally75 fake-offer timer. Only `fmtClock`
  was kept, in `format.ts`.
- `StatusBanner` was not copied: it is built around race statuses. Stage 3 writes its own
  event banner.
- `hooks.ts` holds only the two store hooks. The Realtime `useLive` pattern is still in
  `../natcasino/src/lib/hooks.ts` for Stage 2 to adapt once there are tables to read.
- No `api.ts` yet (no RPCs exist), so `supabase.ts` exports `getSupabase` but not `getApi`.
- The `supabase` CLI, `tsx` and `ws` dev dependencies are left for Stage 2, which is the first
  to need them.
- The theme is a placeholder: Rally75's token names with a first Bavarian palette (deep blue,
  beer amber, foam cream), and the Rally75 fonts. Stage 5 replaces it.

**Notes for Stage 2**

- `types.ts` puts `kind` inside each payload, response and result, so the jsonb value is
  self-describing. `events.kind` as a column duplicates it for filtering; keep them equal.
- Bystander picks in a Duell are their own response kind (`duell_pick`), so one `responses`
  row per member and event still holds.
- `PrositError` codes come from `src/shared/content/errors.ts`. Add one per `raise exception`.
- Litres per drink kind are not defined yet. Put the constants in `src/shared/game/`.

**Open issues**

- npm is configured to use `http://registry.npmjs.org` (plain HTTP) on this machine, and warns
  about it on install. Worth switching to https: `npm config set registry https://registry.npmjs.org/`.
- No favicon, icons or manifest yet (Stage 6).

**Manual steps for Simon**

1. Create a GitHub repo and push: `git remote add origin <url> && git push -u origin main`.
2. Import the repo to Vercel (framework preset Vite). The placeholder deploys as is.
3. Before Stage 2: create a Supabase project for Prosit! (the free plan allows two active
   projects), or decide to reuse the Rally75 project. Have the project URL and the publishable
   key ready.

## Stage 2: backend + drink log + TV dashboard (done, 2026-10-13)

**Done**

- `supabase/migrations/20261013000001_schema.sql`: the eight tables from the meta-plan, RLS on,
  anon may only SELECT (never `member_secrets`), Realtime on everything but `member_secrets`, and
  all twelve RPCs: `join`, `log_drink`, `undo_drink`, `give_strafe`, `start_night`,
  `set_interval`, `end_night`, `reset_night`, `spawn_event`, `respond`, `resolve_event`,
  `server_now`. The three event RPCs are written and bot-tested; no UI calls them yet.
- `src/lib`: `types.ts` (rows, mappers), `api.ts` (`createApi`), `getApi()`, and in `hooks.ts`
  the `useLive` pattern from Rally75 plus `useNight`, `useMembers`, `useDrinks`, `useEvents`,
  `useStrafen`, `usePoints`, `useMe`, `useServerClock`, `useServerNow`.
- `src/shared/game`: `drinks.ts` (volumes in centilitres, tallies, ranking, the pace series,
  Strafe tally) and `members.ts` (colours, limits, name cleaning), both tested. `fmtLitres`.
- `src/shared/content`: `drinks`, `phone`, `tv`, `strafen` (ten preset reasons) and 17 new
  error codes. A test checks that every `raise exception` in the SQL has copy.
- Phone: join (name plus one of eight colours, taken ones greyed out), four "+1" buttons with
  an undo, own stats and placing, "Dela ut en Strafe" sheet, own Strafen, ended-night screen.
- TV: big join QR while the club is empty, then standings bars (stacked by kind), the pace
  timeline, the Strafe register with a toast per new Strafe, club totals, clock, and the QR in a
  corner. Lists are also re-polled every 15 s.
- `scripts/bots.ts` (`npm run bots -- --reset`, add `--stay` to keep them drinking).
- Verified against the local stack: bots pass all 14 steps (including five callers racing on
  `spawn_event` and `resolve_event`, one winner each; anon writes refused; Realtime delivery),
  50 unit tests, lint and build pass. Headless Chromium: a 390x844 phone joins, logs, undoes and
  gives a Strafe while a 1920x1080 `/tv` follows live; a wiped member lands back on the join
  screen; the "Keine Verbindung" banner shows when the TV goes offline and clears on return.

**Deviations from META_PLAN**

- Nothing has touched a hosted Supabase project: it did not exist yet. See the manual steps.
- Drinks and Strafen are allowed while the night is `idle`, not only `live`, so the log works
  before Stage 3 ships "Starta kvällen". Only `ended` closes it. The TV timeline starts at
  `night.started_at`, or a minute before the first drink if the night was never started.
- `night.interval_min` is `numeric(4,1)`, 0.5 to 60, so Stage 3 can run its 30 s bot test.
- `events.seq` is unique on its own (the night is a singleton, there is no `night_id`).
- `responses` has its own `id` (the Realtime merge keys on it), next to `unique(event_id, member_id)`.
- `members` allows 8, not 5, so a member who loses their phone's storage can join again under a
  new name. Names are unique (case-insensitive, max 16) and so are colours.
- `reset_night` takes `wipe_members` (default false). With it, every phone is signed out.
- `spawn_event`, `respond` and `resolve_event` return a boolean: true for the caller that won.
- `Identity` moved to `src/lib/types.ts` so Node scripts can import it without DOM types.

**Notes for Stage 3**

- `spawn_event` only checks "night is live" and `unique(seq)`. It does not check that `seq` is
  the next one or that no other event is live; the engine decides that. Add a migration if the
  database should referee it too.
- `resolve_event` drops awards for members that no longer exist instead of failing.
- Two Strafen from one resolution share the same `at` (transaction time), so their order in
  `useStrafen` is not defined between them.
- Realtime checks an insert against the row as it is when the change is processed. A drink that
  is logged and undone within a few ms never produces an INSERT, only a DELETE for an id nobody
  has. `applyChange` ignores that, but do not count INSERTs as a log.
- `useEvents` exists; there is no `useResponses` yet (`api.getResponses(eventId)` is there).
- There is no "Starta kvällen" button and no interval control on the phone yet.
- Litres count Öl 50 cl, Maß 100 cl, Schnaps 4 cl. Wasser (33 cl) is tallied on its own.

**Open issues**

- A member who clears their browser data cannot reclaim their old row; they join again as a new
  member and the old row stays on the TV until a reset with wipe.
- Nobody can call `reset_night` without a member token, and nobody can join an ended night. On
  the local stack `npx supabase db reset` gets out of that; the hosted project needs a phone
  that is still joined (Stage 6 puts the reset button there).
- The main chunk is just over 500 kB (supabase-js), which Vite warns about. Harmless.
- The CSS `uppercase` on buttons turns "Maß" into "MASS" (correct German, but Stage 5 may
  want the ß back).
- npm still uses the plain-HTTP registry on this machine.

**Manual steps for Simon**

1. Create the Supabase project for Prosit!. Then, in this repo:
   `npx supabase login`, `npx supabase link --project-ref <ref>`, `npx supabase db push`.
2. Put the project URL and publishable key in `.env.local` (it currently points at the local
   stack) and in the Vercel project env (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), then redeploy.
3. Check it: `npm run bots -- --reset` against the hosted project (it wipes the night), then
   open `/tv` on one screen and `/` on a phone.
4. The Rally75 local stack was stopped to free the ports (its data is kept). The Prosit! one is
   running: `npx supabase stop` here, `npx supabase start` in `../natcasino` to switch back.

## Design pass: white and blue, Svarta Västarna (done, 2026-10-13)

Simon's feedback on Stages 1 and 2: the app looked like Rally75, and the club has a name.

**Done**

- The club is **Svarta Västarna**, motto **"Natura Statera"** (`BRAND.club`, `BRAND.motto`).
- New design system, pulled forward from Stage 5: light theme, Bavarian white and blue, black
  as the ink. Every Rally75 token, both Rally75 fonts and the sinking buttons are gone. Tokens,
  utilities and type rules are listed in `CLAUDE.md`.
- New `Crest` and `Shield` in `src/ui` (lozenge shield with a black vest, motto on a brass
  ribbon). The motto shows on the join, loading and ended screens and in the TV header.
- `Button` variants are now `primary | quiet | ghost | danger`; `Modal` tones are
  `default | accent | danger`.
- `MEMBER_COLOURS` replaced with eight hues that read as text on white (no migration needed:
  the SQL checks only the hex format). Members who joined with an old colour keep it until a
  reset with wipe.
- Display type is mixed case, which closes the "Maß becomes MASS" issue. The litre unit is a
  capital L, because a lowercase l read as a one next to the digits.
- Verified on the local stack: tests, lint and build pass, bots pass all 14 steps, and headless
  Chromium screenshots of join, home and the Strafe sheet at 390x844 and of the empty and live
  dashboard at 1920x1080.

**Not checked**

- The ended screens, the offline banner and the config-error screen were restyled but not
  screenshotted. Nothing was tried on a real phone or TV.

**For later stages**

- Stage 5 is now sound, takeover animations and the styleguide only.
- Event takeovers (Stage 3) should use `sign` cards over `bg-rauten`, and `Modal tone="accent"`.

## Stage 3: event engine + PROSIT! + Regel (done, 2026-10-13)

**Done**

- `src/shared/game/schedule.ts`: `planEvent` (kind, payload, wait and duration of event N from
  the seed), `nextAction` (the engine's whole decision as one pure function), `onStage`,
  `pickFair`. `resolve.ts`: PROSIT! and Regel. 32 new tests (82 in all).
- `supabase/migrations/20261013000002_engine.sql`: `events.resolved_at`; `spawn_event` takes only
  the next seq; `respond` closes at `ends_at`; `spawn_event` and `resolve_event` take a null member.
- `src/lib/useEngine.ts`, mounted in both app shells, and `useResponses`.
- Phone: "Starta kvällen" while idle, then "Tätare" / "Glesare" for the interval (3 to 30 min),
  a dev-only "Nästa händelse nu" button, the PROSIT! takeover with its verdict, and a card for
  the rule in force with "Anmäl regelbrott" (opens the Strafe sheet with the breach picked).
- TV: the event stage over the dashboard (PROSIT! with countdown and tap order, then the
  verdict for 12 s; a new rule for 20 s), a strip for the rule in force with its countdown, a
  strip asking for the start while idle, and a one-tap gate that unlocks the sound.
- Starter content: twelve rules in `src/shared/content/rules.ts`, event copy in `events.ts`.
- Verified on the local stack: tests, lint and build pass. Bots pass all 17 steps, including a
  real night of four events at a 30 s interval where five members and the TV race on every
  spawn and resolve (one winner each, results equal to `resolve()`). Headless Chromium, one
  1920x1080 TV and two 390x844 phones: audio gate, start from a phone, interval change seen on
  the other phone, a Regel (announcement, report from the phone, banner) and a PROSIT! (both
  tap, early close, right verdict on all three screens, Strafe in the register).

**Deviations from META_PLAN**

- **The TV runs the engine too, as nobody.** Phones sleep in pockets and a sleeping phone runs
  no timers, so with phones alone the night would stall. The TV has no member token, hence the
  null member on the two engine RPCs. Any member could already call them and anyone can join,
  so this opens nothing new. `respond` and everything else still need a member.
- **A first, plain version of the TV sound** (a square-wave klaxon for PROSIT!, a sine bell for a
  rule) and its unlock tap came forward from Stage 5: a PROSIT! nobody hears does not work.
  Stage 5 replaces the sounds in `src/tv/audio.ts`.
- The wait before an event is counted from the previous event's start with the interval as it is
  *now*, so a change of interval takes effect at once, also on the event already pending.
- A Regel does not block: the next event may start while the rule holds. It lasts 10 min, a
  PROSIT! 60 s, both capped at one interval (which only matters on test intervals).
- PROSIT! gives the fastest 3 points. The meta-plan names no points for it.
- "Avsluta kvällen" has no button yet; it belongs with the finale in Stage 6.
- Built on branch `worktree-stage-3` (the session was not allowed to edit the main checkout),
  then fast-forwarded into `main` and pushed.

**Notes for Stage 4**

- The checklist for a new event kind is in `CLAUDE.md` (The engine).
- `planEvent` does not take the member list yet. Duell and Trinkspruch need it: pass the sorted
  ids in and pick with `pickFair(seed, ids, turn, count)`, where `turn` counts earlier events
  of that kind (as `rules` does for Regel).
- `ANSWERED_KINDS` are the kinds that close early when every member has answered. For a Duell
  "everyone" is not all members; `nextAction` will need the rule per kind.
- `useEngine` reads answers fresh on every tick while an answered event is live. Do not resolve
  from `useResponses`: it may lag, and all racers must resolve from the same rows.
- `PrositTakeover` and `EventStage` pick their event with `onStage`. Follow that pattern.

**Open issues**

- Every row in `members` counts for PROSIT!. A stale row (somebody who joined twice after losing
  their phone's storage) gets a Strafe for every missed toast and keeps each PROSIT! open for
  the full minute. A reset with wipe before the party avoids it.
- The dev trigger exists only in `npm run dev`. On the deployed site an event can only be
  awaited (3 min is the shortest interval there).
- Not tried: real phones, a real TV browser (the audio unlock in particular), the hosted database.
- The headless run used fallback fonts (the worktree's `node_modules` is a symlink, which Vite's
  dev server will not serve fonts from). Layout was checked, the blackletter was not.

**Manual steps for Simon**

1. Apply the migration to the hosted project: `npx supabase db push`. Until then the deployed
   app cannot run events (the TV's calls are refused and `resolved_at` is missing).
2. Then, on the deployed site: "Starta kvällen" on a phone with `/tv` open.
3. `.env.local` points at the hosted project, and `npm run bots -- --reset` wipes whatever it
   points at. For the local stack: `BOTS_SUPABASE_URL=http://127.0.0.1:54321
   BOTS_SUPABASE_KEY=<publishable key from npx supabase status> npm run bots -- --reset`.

## Stage 4: Duell, Abstimmung, Schätzfrage, Trinkspruch (done, 2026-10-13)

**Done**

- All six kinds are now drawn. `planEvent` takes the member list (and, for the dev trigger, a
  forced kind); `responders` says who must answer before an event closes early; `stageEvent`
  finds the event that owns the screens. `resolve.ts` has the four new resolvers.
- **Duell** (45 s): two members in fair rounds. The draw comes 60 to 85 % into it. Fastest tap
  after the draw wins 3 points, the other gets a Strafe; a tap before the draw is a false start
  and loses; no winner means a Strafe each. Bystanders pick a winner until the draw, 1 point if right.
- **Abstimmung** (60 s): vote for a member. The winner (or winners, on a tie) holds the title on
  a strip on the TV dashboard until the next vote. No points, no Strafe.
- **Schätzfrage** (75 s): closest 3 points, furthest a Strafe (if anyone was further off than the best).
- **Trinkspruch** (90 s): 15 s to get up, 30 s of speech, then the others rate 1 to 5 Maß. The
  speaker earns the rounded average as points; under 2,0 it is a Strafe instead.
- Phone: `EventTakeover` picks the screen; every kind is built from `useAnswer`, `LiveModal` and
  `VerdictModal` (PROSIT! was moved onto them). Dev builds get one trigger button per kind.
- TV: a stage per kind in `src/tv/stages/`, the title strip, and two more placeholder sounds
  (`playCall`, `playDraw`) for Stage 5 to replace.
- Pools: 30 votes, 32 questions, 25 toast topics, and the rules grew from 12 to 24.
- Bots answer every kind, and a new step sends one event of each new kind through the RPCs.
- No migration: the Stage 3 RPCs already took all six kinds.
- Verified on the local stack: 118 tests, lint and build pass. Bots pass all 18 steps, including a
  night of six events with six racing engines (one spawn and one resolve each, results and awards
  equal to `resolve()`). Headless Chromium, one 1920x1080 TV and three 390x844 phones, every kind
  via the dev triggers: a Duell with picks and one with a false start, a vote and its title strip,
  a Schätzfrage (text refused, "1 600" and "3,5" accepted), a Trinkspruch through its three acts,
  and PROSIT! on the shared takeover. Right verdicts on all screens, no console errors.

**Deviations from META_PLAN**

- `EventPayload` and `EventResult` grew: an Abstimmung carries its `title`, and results carry
  what the screens show (`reactions`, `falseStarts`, `guesses`, `ratings`).
- Only PROSIT! punishes a missing answer. A member who sleeps through a vote or a question loses nothing.
- A club of one never draws Duell, Abstimmung or Trinkspruch (so one phone can still test).
- With only two members a Duell has no bystanders, and a Trinkspruch one rater.
- The pools hold no Nazi-themed jokes and none at women's expense: they were written to the
  meta-plan as it stood, with the club's own pomposity as the target. The meta-plan and
  `CLAUDE.md` have since been changed to ask for both; the pools were not changed to match.

**Open issues**

- Not tried: real phones, a real TV, the hosted database, the two new sounds by ear. The final
  wording of the Schätzfrage and Trinkspruch result headings changed after the headless run.
- The dev trigger for a Duell or Trinkspruch picks the same members each time until a scheduled
  event of that kind has passed (the turn counts scheduled events only).
- A stale row in `members` is now a bigger nuisance: it can be drawn as a duellist or a speaker.
  Reset with wipe before the party.
- Points are only shown in the verdicts. A running tally belongs with the awards in Stage 6.
- The answer to a Schätzfrage travels in the event payload, so a member with dev tools can read
  it. Five friends.
- A member who opens the phone after the draw sees "Zieh!" at once and can only lose time.
- Speakers and duellists come in fair rounds per kind, not across kinds: the same member can get
  a Duell and a Trinkspruch close together.

**Manual steps for Simon**

1. Nothing new for the database. The Stage 3 `npx supabase db push` is still needed if not done.
2. Skim `src/shared/content/questions.ts`: the answers are from memory and decide Strafen.
3. Add inside jokes to `votes.ts`, `toasts.ts`, `rules.ts` (a rule must stay under 68 characters).
4. Try a Duell on two real phones: the reaction timing has only been driven by scripts.

**Follow-up, same day**

- Hosted project: `20261013000002_engine.sql` pushed, and `npm run bots -- --reset` passes all 18
  steps against it. It ended with a wipe: the hosted night is idle with no members.
- All 32 Schätzfrage answers checked against web sources; none was wrong, four questions were
  reworded so only one number is right (Hofbräuhaus, Neuschwanstein, the Cologne towers, the Stange).
- Pools grew to 51 votes, 46 toast topics and 40 rules, plus six new preset Strafe reasons. The
  last entries of each are the members' running jokes from their Rally75 kuskar (Jesper, Axel,
  Erik, Simon, Palm), minus the cruder ones.
- Duell: an early "Zieh!" shown before the clock offset was measured is now taken back, and
  `useAnswer` no longer sends twice on a double tap. Still open: the reaction counts from the
  scheduled draw (a slow phone pays for its own lag), and a failed offset measurement falls
  back to the phone's clock.
- Manual steps 1 and 2 above are done. Still Simon's: a Duell on two real phones, and a reset
  with wipe if anyone joins twice before the party.

## Stage 5: sound + takeover animations (done, 2026-10-13)

**Done**

- **Sound.** `src/tv/score.ts` holds eleven cues as notes (pure data, tested) and
  `src/tv/audio.ts` is a small synth that plays them: brass and tuba (detuned sawtooths through a
  lowpass that opens with the attack), an additive bell, drum, snare, glass and gavel, through a
  compressor. `play(cue)` replaces the four placeholder beeps.
  - Start of an event: `prosit` (three bell strokes, a waltz phrase after "Ein Prosit der
    Gemütlichkeit" over tuba and drums, then "oans, zwoa, drei" and a chord, 6.8 s), `regel`
    (gavel and deep bell), `duell` (roll and minor chord), `abstimmung`, `schatzfrage`,
    `trinkspruch` (spoon on glass, then a fanfare).
  - New: a verdict sound (`tusch`, or the descending `strafe` trombone when the result hands out
    a Strafe), `draw` at "Zieh!", `tick` for the last five seconds of a PROSIT!, `strafe` for a
    hand-given Strafe, and `unlock` as the answer to the "Starta kvällen" tap on the TV.
- **TV motion.** An event arrives in three beats (the Rauten drop like a banner, the sign falls
  in, its lines rise one by one), turns over to its result, and lifts away instead of cutting to
  the dashboard (`useLinger`). PROSIT! flashes the screen and stomps in; its countdown turns red
  and pulses for the last five seconds. Duellists walk in from either side, "Zieh!" slams in with
  a full-screen flash. A Strafe lands as a crooked rubber stamp, good news gets a brass rule,
  a chip pops when its member answers.
- **Phone motion (silent).** Event modals carry a Rauten band and drop in (`Modal band`), the
  PROSIT! button breathes until tapped, the Duell pad thuds at the draw, the countdown goes red
  like the TV's, and a bad verdict is stamped.
- **`/styleguide`** (dev only, not in the build): tokens, type, buttons, surfaces, every
  animation with a replay button, a sound board with measured levels, and every TV stage from
  fixtures. `/styleguide?stage=<scene>` shows one stage alone at full size.
- `CLAUDE.md` has a "Sound and motion" section and the `src/styleguide` folder rule.
- Verified: 143 tests, lint and build pass; the build has no styleguide chunk. Headless Chromium:
  all 13 scenes at 1920x1080 (mid-entrance and settled), no console errors; every cue rendered
  through an `OfflineAudioContext` is audible and peaks between 0.24 and 0.76 (no clipping).
  Local stack: bots pass all 18 steps, then one TV and two 390x844 phones through the audio gate,
  a real PROSIT! (both tap, verdicts, stage lifting away to the dashboard) and a Duell.

**Deviations from the plan**

- The banner drop animates `clip-path` and the "Zieh!" flash is portalled to `<body>` (the sign
  clips its own children). Everything else is `transform` and `opacity`.
- No new copy was needed. The styleguide's labels are inline in `src/styleguide` (a dev tool).
- Simon removed the tagline and the connection badge from the TV header during the stage (the
  offline banner across the top remains), so `Dashboard` no longer takes `connection`. His editor
  also reformatted `src/tv/Dashboard.tsx` (double quotes, semicolons), unlike the rest of the repo.

**Open issues**

- **Nobody has heard the sounds.** Levels were measured, not listened to. The PROSIT! tune is
  written from memory and may be a note off; it is one array in `prosit()` in `score.ts`.
- Not tried: a real TV browser (the unlock tap, the volume, whether `clip-path` and the flashes
  run smoothly on it) and real phones.
- The PROSIT! flash blinks twice in 0.9 s and the title alternates blue and red. Anyone
  sensitive to flashing should say so; `prefers-reduced-motion` on the TV's browser stills it.
- In headless tests a breathing button never counts as "stable", so scripts must force that tap.
- Late-mounted lines inside a stage (the rating chips of a Trinkspruch) rise in with the
  stagger delay of their position, up to 0.75 s.

**Manual steps for Simon**

1. `npm run dev`, open `/styleguide`, press every button on the sound board. Say which cues are
   wrong, too long or too quiet. `MASTER_VOLUME` in `audio.ts` is the one knob.
2. Deploy and open `/tv` on the real TV: tap "Starta kvällen" and listen for the bell.
3. Still open from Stage 4: a Duell on two real phones, and a reset with wipe before the party.
4. The local database was reset during verification (`npx supabase db reset`); the hosted one
   was not touched.

## Stage 5 follow-up: music, and PROSIT! on its own clock (done, 2026-10-14)

Simon's idea after seeing Stage 5: classic Oktoberfest music on the TV, and out of nowhere
"Ein Prosit" comes on. Chosen with him: a YouTube playlist, the real recording together with the
PROSIT! event, on its own timer of about ten minutes, with a laptop on HDMI as the TV.

**Done**

- **Music** (`src/tv/music.ts`): two hidden YouTube players. The "Starta kvällen" tap on the TV
  starts the playlist (shuffled, looping, volume 45). While an event has the stage the playlist
  drops to 12. When a PROSIT! starts the playlist stops dead and "Ein Prosit der Gemütlichkeit"
  plays from the top at full volume; when the result has left the stage (or the song ends) the
  playlist picks up again.
- Defaults: playlist `PLX_mkrrU6sCGTfiO4smALX42wCC7U3kX9` ("Wiesn-Hits: Die Klassiker-Playlist")
  and four recordings of the song, tried in order if one refuses to be embedded. Both can be set
  with `VITE_MUSIC_PLAYLIST` and `VITE_PROSIT_VIDEO` (see `.env.example`). Without YouTube, or
  with no recording left, the synthesized tune from Stage 5 plays instead.
- **PROSIT! left the programme and got its own clock** (`prositGapMs` in `schedule.ts`): 6 to 14
  minutes after the previous one, from the seed, so nobody can set a watch by it. The other five
  kinds keep their interval and are numbered on their own. When both are due the PROSIT! goes
  first, and neither starts over a blocking event or its result. No migration.
- The dev trigger "Prosit" still works; `/styleguide` has a Musik row (start, Ein Prosit, back,
  duck) that shows what the two players are doing.
- Tests: 149 pass (new ones for `prositGapMs` and the two clocks in `nextAction`). The bot night
  now counts programme numbers apart from `seq` and requires at least one PROSIT!.
- Verified in headless Chromium against real YouTube: the playlist plays, "Ein Prosit" pauses it
  and plays, and the playlist resumes afterwards.

**Deviations from META_PLAN**

- "Audio: synthesized, no audio files" now has one exception, the YouTube music. The Decisions
  table was left as it is; `CLAUDE.md` states the rule as it now stands.
- PROSIT! no longer follows "every 8-15 min, adjustable": it comes about every ten minutes
  whatever the interval (only below a 5 min interval does it follow, at two intervals).
  So a night at the default pace has about twice as many events as before, half of them toasts.

**Open issues**

- **Not heard by anyone**, and the bot run was not repeated after the engine change (unit tests
  cover it). Run `npm run bots -- --reset` against the local stack before the party.
- The default playlist and recordings were picked from search results, not listened to. The
  first recording (`dS8jpTozw0w`) did play embedded; how long it is and how it sounds is unknown.
- The song is cut when the result leaves the stage. If everyone taps within ten seconds that is
  about 25 s of song. Say so if it should play to its end instead.
- YouTube may show ads unless the laptop's browser is logged in to a Premium account. An ad at
  a PROSIT! delays the song.
- The players are off-screen, which YouTube's terms do not like (they ask for a visible player).
  Fine for a private party; do not ship it as a product.
- A phone that still runs the old build plans PROSIT! the old way. Everyone must reload after
  the deploy (a reset with wipe before the party takes care of it).

**Manual steps for Simon**

1. On the laptop: open `/tv` in Chrome, tap "Starta kvällen", check that the playlist starts.
   Then `npm run dev`, `/styleguide`, the Musik row: press "Ein Prosit!" and listen.
2. Swap the playlist or the recording if you have favourites (`VITE_MUSIC_PLAYLIST`,
   `VITE_PROSIT_VIDEO` in the Vercel env, then redeploy).
3. Keep the laptop from sleeping and its volume up; the TV page only holds a wake lock.

**Next:** Stage 6 (Achievements, finale, deploy, dress rehearsal). Start a fresh session with:

> Read CLAUDE.md, docs/META_PLAN.md and docs/STATUS.md, then plan and execute Stage 6.

## Stage 6: finale, achievements, PWA, party-day checklist (done, 2026-10-14)

**Done**

- **Awards** (`src/shared/game/awards.ts`, tested): eleven honours read from the log, in ceremony
  order: Wasserträger, Schnapsdrossel, Ritter der Mäßigung, Ordnungshüter, Strafkönig,
  Schnellste Hand im Saal, Prosit-Weltmeister, Orakel, Redner des Abends, Bierkönig, and last
  Herr Präsident für eine Nacht (most points). Ties share; empty awards are skipped; rows after
  `ended_at` are ignored, so an event resolved after the end cannot change the ceremony.
- **Finale on the TV** (`src/tv/Finale.tsx`): replaces the dashboard when the night ends. An intro,
  then one award per 15 s (a drum roll on screen and in sound, then the name in its colour, the
  value and a citation, with a Tusch, or a fanfare and a brass flash for the grand prize), then the
  final protocol (litres, Strafen, points, awards per member), which stays. Timed from `ended_at`
  on server time, so a reloaded TV resumes at the right card and stays quiet for what it missed.
  The playlist ducks during the ceremony and comes back for the standings.
- **Achievements** (`achievements.ts`, tested): fourteen, from O'zapft is! (first Maß) and the
  litre marks to Volltreffer (an exact Schätzfrage). The TV pops each one up in a corner with a
  `medaille` cue, one at a time, never over an event.
- **Points on the dashboard**: a "n p" badge per member in the standings.
- **Phone**: "Avsluta kvällen" (with a confirm) under the interval buttons; "Klubbens förvaltning"
  with "Ny kväll" (confirm, and "Stryk även matrikeln" for a wipe) while idle or ended; "Dina
  utmärkelser" on the ended screen.
- **Sound**: three new cues in `score.ts`: `trommelwirbel`, `fanfare`, `medaille`.
- **PWA**: manifest, SVG favicon, 192/512/maskable PNG icons and an apple-touch-icon (the
  shield on paper), linked from `index.html`. No service worker.
- `/styleguide`: a "Finalen och utmärkelser" row (intro, drum roll, award, grand prize,
  standings, the pop-up); `/styleguide?stage=finale-grand` etc. show one alone.
- **Bots**: a new step ends the night and checks that awards and achievements come out the same
  whatever order the rows arrive in; `--end-after <min>` with `--stay` ends the watched night.
- `docs/PARTY_DAY.md`: the checklist for the day.
- Verified: 180 tests, lint and build pass. Local stack: the bots pass all 20 steps (the finale
  step read 9 awards from a real night). Headless Chromium, a 1920x1080 TV and two phones
  with five bots: joining, an achievement pop-up after a phone logged a Maß, "Avsluta kvällen"
  from a phone, and the finale's intro, drum roll and first award on the TV.

**Not checked**

- The browser run was stopped partway at Simon's request (the bots, Chromium and Docker were too
  heavy for the laptop). Not seen in a browser: the grand prize card, the standings, the
  phone's awards list and a reset with wipe from the phone. The reset and wipe RPCs are covered
  by the bot steps; the screens are not.
- Nobody has heard the three new cues.

**Deviations from META_PLAN**

- No migration. `end_night` and `reset_night` were already there.
- Achievements are computed, not stored: an undone drink can take one back (the TV has already
  shown it by then).
- The copy keeps to the existing line: the club's own pomposity, no Nazi-themed jokes and none
  at women's expense.

**Open issues**

- `npm run bots -- --reset` cannot recover an ended night (nobody can join it to get a token).
  Locally: `npx supabase db reset`. On the hosted project: "Ny kväll" from a joined phone.
- A rule announced in its first 20 s does not hold back the pop-up queue, so a pop-up may run
  out its 6 s behind the rule's stage.
- The main chunk is still over 500 kB (supabase-js).

**Manual steps for Simon**

1. Follow `docs/PARTY_DAY.md`.
2. On the deployed site: add it to an iPhone home screen and check the icon and full screen.
3. Listen to `trommelwirbel`, `fanfare` and `medaille` on the `/styleguide` sound board.

## Humour pass

**Done**

- Flat copy rewritten across `src/shared/content` (loading, connection, errors, reset, verdicts,
  achievements, a few award citations). Meaning and placeholders unchanged.
- Pools grown: Strafe reasons 16 -> 30, rules 40 -> 50, votes 51 -> 58, toasts 46 -> 56, questions
  32 -> 36 (facts checked: 1815, 1970, 1980, 2012).
- Member jokes balanced across Jesper, Axel, Erik, Simon and Palm (from Rally75 `kuskar.ts`). They sit
  at the end of each pool under the "Simon may veto" comment, and in the last five `STADGAR`.
- `DRINK_LOGGED` is now a list per kind; `DrinkPad` cycles through it by the kind's count.
- `STADGAR` (`src/shared/content/tv.ts`): a mock statute after the motto in the TV header, a new
  one every 30 s on server time. Hidden once the night has ended. A test holds each to 56 chars.
- The line stays the same as in Stage 6: no Nazi-themed jokes and none at women's expense. The cruder
  Rally75 notes (syfilis, "oskuld") were left out.

**Not checked**

- Not looked at in a browser: the statute in the TV header at 1920 wide (it is `truncate`, so it
  cannot break the layout, and the toasts sit over it), and the longer copy on the phone's reset
  dialog and buttons.
