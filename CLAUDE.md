# Prosit!

Oktoberfest companion app for Simon's five-man gentlemen's club. Members log drinks and answer
events on their phones (`/`), a TV shows the dashboard and stages every event (`/tv`), Supabase
is the shared backend. There is no game master: the app paces itself.

- `docs/META_PLAN.md`: the contract between stages. Its Decisions table is fixed.
- `docs/STATUS.md`: handoff log. Read it first, append your stage's section when done.
- `../natcasino` (Rally75) is the sibling project this one started from. Read it for patterns
  (`src/lib/hooks.ts` for Realtime subscriptions, `scripts/smoke.ts` for bot scripts), copy what
  you need, never import across repos.

## Hard rules

- **Swedish with fake German** in all user-facing text, including errors, empty states and
  loading states. Swedish carries the meaning; German is the seasoning (Prosit, Maß, Strafe,
  Herr Präsident, "Keine Verbindung"). A member who knows no German must still understand it.
- **Humour.** The club is a pompous, arch-conservative Herrenklubb: mock-solemn statutes,
  inflated titles, outrage at modernity (oat milk, alcohol-free beer, e-scooters), "så har vi
  alltid gjort". Bavarian beer-hall kitsch. **No Nazi-themed content**, in any form.
- **No em dash** (U+2014) anywhere under `src/`, in any language. A test enforces this. Use a
  comma, a period or parentheses instead. In source code write `'—'` if you must refer to it.
- **Audio on the TV only**, synthesized with Web Audio (no audio files). Phones stay silent.
- **The TV is pure output.** After the one "Starta kvällen" tap that unlocks audio, nothing on
  `/tv` needs touching. Every control lives on the phones.
- **No game master.** Any member can start the night, change the interval and end it. Never add
  a password gate or an admin role.
- State is authoritative in the DB and changes **only** through server-side RPCs.
- Network is required; show clear "Keine Verbindung" states with auto-retry, no offline mode.

## Stack and commands

Vite 8 + React 19 + TypeScript + Tailwind v4 (`@tailwindcss/vite`, `@import "tailwindcss"` in
`src/index.css`) + React Router 7 (`react-router` package) + Vitest 4 + ESLint 10 (flat config).
Supabase via `@supabase/supabase-js`. Deployed on Vercel (`vercel.json` SPA rewrite).

```
npm run dev      # dev server: / is the phone, /tv is the TV
npm test         # vitest run (all src/**/*.test.ts)
npm run lint
npm run build    # tsc -b && vite build
npm run bots -- --reset          # backend check: five fake members through every RPC (WIPES the night)
npm run bots -- --reset --stay   # then keep them drinking, to watch /tv
npx supabase start               # local stack (Docker); `npx supabase db reset` reapplies the migrations
```

Env: copy `.env.example` to `.env.local`. Only `VITE_`-prefixed vars reach the browser.

## Folder rules

```
src/shared/content/  Copy and pools (rules, votes, questions, awards). Data plus string templates only.
src/shared/game/     Pure game logic: rng, types, format; schedule, resolve, awards from Stage 3.
src/lib/             Supabase client, typed RPC wrappers, realtime hooks, clock, identity.
src/ui/              Design-system components shared by both apps.
src/client/          Phone app, route "/".
src/tv/              TV app, route "/tv". Lazy-loaded, so phones never download it.
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
- Only `src/lib` imports Supabase. Components use the hooks in `src/lib/hooks.ts`; RPC errors
  arrive as `PrositError` with copy from `src/shared/content/errors.ts` (add a code there when
  adding a `raise exception`).
- Data flows one way: `src/lib/api.ts` (`createApi`, typed reads and one wrapper per RPC) ->
  `src/lib/hooks.ts` (`useNight`, `useMembers`, `useDrinks`, `useEvents`, `useStrafen`, `usePoints`,
  `useMe`, `useServerClock`) -> components. Rows are mapped in `src/lib/types.ts`: camelCase, and
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
database referees.

- `schedule` (pure): event N's kind, payload and start time, from `createRng(nightSeed + N)`.
- `resolve` (pure): event + responses -> `Resolution` (`src/shared/game/types.ts`).
- Clients call `spawn_event` / `resolve_event` when due, on **server time** (`src/lib/clock.ts`).
- Clients race on purpose. `unique(night_id, seq)` and "only while `status = 'live'`" make the
  first write win and the rest no-ops. This only works while schedule and resolve stay
  deterministic: the same inputs must give the same output on every device.
- `events.payload`, `events.result` and `responses.payload` hold the `EventPayload`,
  `EventResult` and `EventResponse` unions. They must survive a JSON round trip.

## Design system

- Tokens live in `@theme` in `src/index.css`. Use tokens, not raw Tailwind colours. Dark only.
- The current palette and the token names (`night`, `tote`, `plate`, `sleaze`, `cash`, `drift`,
  `ink`) are **placeholders** inherited from Rally75. Stage 5 owns the real design system and may
  rename them.
- Build screens from `src/ui` (import from `'../ui'`): `Button`, `Modal` (native `<dialog>`,
  stacks), `toast()` + `<Toaster />` (mount once per app), `ConnectionBadge`, `QrCode`,
  `RollingNumber`, `LoadingScreen`. Most take `size` with a `tv` variant.
- TV type sizes: `text-tv-sm/md/lg/xl`.
