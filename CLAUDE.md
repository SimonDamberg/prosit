# Prosit!

Oktoberfest companion app for Simon's five-man gentlemen's club, **Svarta Västarna** (motto
"Natura Statera"). Members log drinks and answer
events on their phones (`/`), a TV shows the dashboard and stages every event (`/tv`), Supabase
is the shared backend. There is no game master: the app paces itself.

- `docs/META_PLAN.md`: the contract between stages. Its Decisions table is fixed.
- `docs/STATUS.md`: handoff log. Read it first, append your stage's section when done.
- `../natcasino` (Rally75) is the sibling project this one started from. Read it for patterns
  (`src/lib/hooks.ts` for Realtime subscriptions, `scripts/smoke.ts` for bot scripts), copy what
  you need, never import across repos.

## Hard rules

- **Swedish** in all user-facing text, including errors, empty states and loading states. The
  members speak no German, so German is limited to words every Swede knows from Oktoberfest
  (Prosit, Prost, Maß, Bier, Schnaps, Jawohl, Herr Präsident, Brezel, Lederhosen, "Ordnung muss
  sein"), the event names (Duell, Regel, Abstimmung, Schätzfrage, Trinkspruch, Ehrengericht),
  Strafe and Wasser, Der Herold's spoken shouts, and the titles: Abstimmung titles, achievements
  and awards stay German, because that is where it is funny. No other German phrases.
- **Humour.** Svarta Västarna is a pompous, arch-conservative Herrenklubb: mock-solemn statutes, mock women and women rights,
  inflated titles, outrage at modernity (oat milk, alcohol-free beer, e-scooters), "så har vi
  alltid gjort". Bavarian beer-hall kitsch. **Nazi-themed content**, is apprieciated.
- **No em dash** (U+2014) anywhere under `src/`, in any language. A test enforces this. Use a
  comma, a period or parentheses instead. In source code write `'—'` if you must refer to it.
- **Audio on the TV only.** Phones stay silent. Event sounds are synthesized with Web Audio (no
  audio files). The one exception is the music: a YouTube playlist in the background and the real
  "Ein Prosit" at every PROSIT! (`src/tv/music.ts`), which must always fall back to the synth.
- **The TV is pure output.** After the one "Starta kvällen" tap that unlocks audio, nothing on
  `/tv` needs touching. Every control lives on the phones.
- **No game master.** Any member can start the night, change the interval and end it. Never add
  a password gate or an admin role.
- State is authoritative in the DB and changes **only** through server-side RPCs.
- Network is required; show clear "Ingen anslutning" states with auto-retry, no offline mode.

## Stack and commands

Vite 8 + React 19 + TypeScript + Tailwind v4 (`@tailwindcss/vite`, `@import "tailwindcss"` in
`src/index.css`) + React Router 7 (`react-router` package) + Vitest 4 + ESLint 10 (flat config).
Supabase via `@supabase/supabase-js`. Deployed on Vercel (`vercel.json` SPA rewrite).

```
npm run dev      # dev server: / is the phone, /tv is the TV
npm test         # vitest run (all src/**/*.test.ts)
npm run lint
npm run build    # tsc -b && vite build
npm run bots -- --reset          # backend check: five fake members through every RPC, then a short
                                 # night with six racing engines, about 4 min (WIPES the night)
npm run bots -- --reset --stay   # then keep them drinking and answering events, to watch /tv
                                 # (add --end-after 10 to end the night and see the finale)
npx supabase start               # local stack (Docker); `npx supabase db reset` reapplies the migrations
```

Env: copy `.env.example` to `.env.local`. Only `VITE_`-prefixed vars reach the browser.

## Folder rules

```
src/shared/content/  Copy and pools (rules, votes, questions, toasts, awards). Data plus string templates only.
src/shared/game/     Pure game logic: rng, types, format; schedule, resolve, awards from Stage 3.
src/lib/             Supabase client, typed RPC wrappers, realtime hooks, clock, identity.
src/ui/              Design-system components shared by both apps.
src/client/          Phone app, route "/".
src/tv/              TV app, route "/tv". Lazy-loaded, so phones never download it.
src/styleguide/      Dev-only route "/styleguide": tokens, sound board, every TV stage from fixtures.
supabase/migrations/ SQL migrations: schema, RLS, grants and every RPC.
scripts/             Node scripts: bots.ts drives the backend through src/lib/api.ts.
```

- `src/shared/` never imports React, the DOM, or Supabase. It must run in Node (tests).
- `src/shared/game` is **pure and deterministic**: all randomness goes through an `Rng` from
  `createRng(seed)`. Never call `Math.random` or `Date.now` there; time comes in as an argument.
  `randomSeed()` is the one impure helper.
- Every change in `src/shared/game` comes with tests.
- Copy lives in `src/shared/content`, not inline in components.
- `src/client` and `src/tv` never import each other; share through `src/ui`, `src/lib`, `src/shared`.
  `src/styleguide` may import from both. Nothing imports from it, and the build leaves it out.
- Only `src/lib` imports Supabase. Components use the hooks in `src/lib/hooks.ts`; RPC errors
  arrive as `PrositError` with copy from `src/shared/content/errors.ts` (add a code there when
  adding a `raise exception`).
- Data flows one way: `src/lib/api.ts` (`createApi`, typed reads and one wrapper per RPC) ->
  `src/lib/hooks.ts` (`useNight`, `useMembers`, `useDrinks`, `useEvents`, `useStrafen`, `usePoints`,
  `useResponses`, `useMe`, `useServerClock`) -> components. Rows are mapped in `src/lib/types.ts`: camelCase, and
  timestamps as ms since the epoch in server time.
- A successful RPC does not update local state. The change comes back through Realtime, the same
  way it reaches every other device.
- Limits that exist in both SQL and TypeScript (name length, member cap, reason length, drink
  kinds) are mirrored by hand: `src/shared/game/members.ts` and the migration. Change both.
- Migrations are append-only once pushed: never edit an applied file, add a new one.
- Tests are colocated as `*.test.ts`. They are type-checked via `tsconfig.node.json` (Node
  types available), while `tsconfig.app.json` covers app code with DOM types only.

## The engine (Stage 3, the idea every stage must respect)

There is no server process and no GM, so **every connected client runs the same engine** and the
database referees. That includes the TV: phones sleep in pockets, the TV never does, so it runs
the engine as nobody (`spawn_event` and `resolve_event` take a null member; nothing else does).

- `planEvent(seed, seq, intervalMin, memberIds)` in `src/shared/game/schedule.ts` (pure): event
  N of the **programme**: kind, payload, wait and duration, from `createRng(seed + N)`. Kinds never
  repeat back to back. `ENABLED_KINDS` are the seven it draws; `COMPANY_KINDS` need two members.
- **PROSIT! is not in the programme. It has its own clock:** `prositGapMs(seed, count, interval)`,
  6 to 14 min after the previous PROSIT! (about every ten), so it cuts in between the others. The
  programme number of an event is therefore not its `seq`; `nextAction` sets the `seq`. Texts come
  from seed-shuffled pools, duellists and speakers from `pickFair` (fair rounds).
- `nextAction(state, now)` (pure, same file): the whole decision, `spawn`, `resolve` or `wait`.
  Each clock waits from the previous event of its own kind (`started_at`, at the *current*
  interval); when both are due the PROSIT! goes first; neither starts over a blocking event or its result. A Regel is
  non-blocking: the next event may start while the rule holds. An event closes early once
  everyone in `responders(payload, memberIds)` has answered (a Duell: its two duellists).
- `stageEvent(events, now)`: the blocking event that owns the screens, live or showing its
  result for `RESULT_MS`. The phone (`EventTakeover`) and the TV (`EventStage`) both use it.
- `resolve(payload, answers, memberIds)` in `resolve.ts` (pure) -> `Resolution` (`types.ts`).
- `useEngine` (`src/lib/useEngine.ts`) ticks on **server time** (`src/lib/clock.ts`), reads the
  answers fresh and calls `spawn_event` / `resolve_event`. Mounted once in each app shell.
- Clients race on purpose. `unique(seq)`, "only the next seq" and "only while `status = 'live'`"
  make the first write win and the rest no-ops. `respond` closes at `ends_at`, so the answers are
  frozen before anyone resolves. This only works while schedule and resolve stay deterministic:
  the same inputs must give the same output on every device.
- A new event kind needs: a `planEvent` case and an entry in `ENABLED_KINDS`, a `responders`
  rule, a `resolve` case, copy in `src/shared/content/events.ts`, a takeover in
  `src/client/EventTakeover.tsx` (built from `useAnswer`, `LiveModal`, `VerdictModal`), a stage in
  `src/tv/EventStage.tsx` (`src/tv/stages/`), a bot answer in `scripts/bots.ts`, and tests for
  both pure functions.
- Only PROSIT! punishes a missing answer. A Duell tap is `serverNow - started_at` on the phone
  that showed the draw, so a clock offset cancels out; a tap before `drawAfterMs` is a false start.
- `events.payload`, `events.result` and `responses.payload` hold the `EventPayload`,
  `EventResult` and `EventResponse` unions. They must survive a JSON round trip.

## Finale and achievements (Stage 6)

- `computeAwards(log)` in `src/shared/game/awards.ts` (pure): the night's log -> the awards, in
  ceremony order with `praesident` (most points) last. Ties share an award; an award nobody
  earned is skipped; nothing after `night.endedAt` counts. `finaleStep(endedAt, count, now)`
  times the ceremony on server time (intro, 15 s per award with a drum roll, then the standings).
- `computeAchievements(log)` in `achievements.ts` (pure): each member earns each achievement once,
  at the time of the row that earned it. Nothing is stored: the TV announces what is new since it
  loaded (`src/tv/AchievementPopup.tsx`), one at a time, held while an event has the stage.
- A new award or achievement: a key in the list, a rule in the function, copy in
  `src/shared/content/awards.ts` or `achievements.ts`, and a test.
- `src/tv/Finale.tsx` replaces the dashboard once the night is `ended`. The phone shows
  "Dina utmärkelser". "Avsluta kvällen" lives in `NightControls`, "Ny kväll" (reset, optionally
  with wipe) in `ResetPanel`.
- **Handover** (`issue_claim` / `claim`): any member shows any member's card (`HandoverPanel`),
  a ten-minute code as a QR to `/?claim=CODE`; the new phone gets a fresh token and the old one
  stops working. This replaces joining twice after a lost phone.
- PWA: `public/manifest.webmanifest` and the icons in `public/`. No service worker (no offline mode).
- `docs/PARTY_DAY.md` is the checklist for the night.

## Design system

Traditional Bavarian white and blue. It must never look like Rally75 (no dark navy, no yellow
plates, no condensed uppercase sans, no chunky sinking buttons).

- **Light only.** White is the ground, blue is the voice, black (the vests) is the ink.
- Tokens live in `@theme` in `src/index.css`. Use tokens, not raw Tailwind colours: `paper`,
  `paper-deep`, `card` (surfaces), `himmel` (flag sky blue: fills and rules, too light for small
  text), `koenig`, `koenig-deep` (headings, buttons, borders, big numbers), `weste`, `weste-dim`
  (text), `messing`, `messing-deep` (brass, sparingly), `strafe`, `strafe-deep`, `gut`.
- Utilities in `src/index.css`: `bg-rauten` (the lozenge field, as a backdrop behind a card),
  `rauten-band` (one row of lozenges as a trim, sized by font size), `sign` (the white card with
  a blue edge), `label-rule` (section label followed by a rule).
- Type: `font-display` is a blackletter (Grenze Gotisch) for the brand, headings and names.
  **Never uppercase it.** `font-body` (Bitter) carries body text and every number.
- The club name and motto come from `BRAND` in `src/shared/content/ui.ts`. The motto belongs on
  the `Crest` (join, loading and ended screens, the TV header), not in running copy.
- Build screens from `src/ui` (import from `'../ui'`): `Button`, `Modal` (native `<dialog>`,
  stacks), `toast()` + `<Toaster />` (mount once per app), `ConnectionBadge`, `QrCode`,
  `RollingNumber`, `LoadingScreen`, `Crest` and `Shield`. Most take `size` with a `tv` variant.
- TV type sizes: `text-tv-sm/md/lg/xl`.

## Sound and motion (Stage 5)

- **Sounds are data.** `src/tv/score.ts` holds every cue as a list of notes (pure, tested);
  `src/tv/audio.ts` is the synth (brass, tuba, bell, drum, snare, glass, knock) and exports
  `play(cue)`. A new sound is a new entry in `CUES`, never an oscillator in a component. The cue
  for the start of an event has the event kind's name.
- `EventStage` plays the start cue and the verdict (`tusch`, or `strafe` when the result hands
  out a Strafe). A new event kind with a Strafe needs a case in `hasStrafe` there.
- **Motion is CSS**, as `--animate-*` in `@theme` in `src/index.css`: `banner-drop`, `sign-drop`,
  `stage-out` and `flip-in` (the stage arriving, leaving and turning to its result), `prosit` and
  `slam` (a word that lands), `flash` (on an overlay only), `stamp` (a Strafe), `thud`,
  `chip-pop`, `urgent` (the last 5 s of a countdown), `breathe`, `from-left` / `from-right`.
  Utilities: `stagger` (children rise in one by one; an `animate-*` on a child replaces it) and
  `flourish` (a brass rule under good news).
- `StageFrame` (`src/tv/EventStage.tsx`) is the stage without the engine; `Modal` takes `band`
  for event modals on the phone (`LiveModal`, `VerdictModal` use it).
- **Music** (`src/tv/music.ts`): two hidden YouTube IFrame players, started by the unlock tap.
  `MUSIC` holds the playlist id and the "Ein Prosit" video ids (override with
  `VITE_MUSIC_PLAYLIST` / `VITE_PROSIT_VIDEO`). `EventStage` calls `playProsit()` when a PROSIT!
  starts (false means: play the synth cue instead) and `setStageBusy()` to duck the playlist
  while any event has the stage and to return to it afterwards.
- **Der Herold** (`src/tv/herold.ts`): the TV reads verdicts, hand-given Strafen, achievements,
  awards and a Machtwechsel aloud with `speechSynthesis` in a German voice (lines in `HEROLD`,
  `src/shared/content/tv.ts`). Primed by the unlock tap, ducks the playlist, silent without
  voices, off with `VITE_HEROLD=off`. Call `say(line, delayMs)` after the cue, never over it.
- `/styleguide` (dev only) shows all of it. `/styleguide?stage=prosit-live` is one stage alone at
  full size; the scene names are in `src/styleguide/fixtures.ts`. Add a scene for a new stage.
