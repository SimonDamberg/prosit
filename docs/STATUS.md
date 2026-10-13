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

**Next:** Stage 2 (Backend + drink log + TV dashboard). Start a fresh session in `Hobby/prosit` with:

> Read CLAUDE.md, docs/META_PLAN.md and docs/STATUS.md, then plan and execute Stage 2.
