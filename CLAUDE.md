# MusicStand

The product name is **MusicStand** (formerly MALguitar; the repo folder, npm package and Supabase project id still say `malguitar`).

"MyAnimeList / Beli for guitarists." A **personal tool first**: I keep a library of songs (want to learn / learning / learned / shelved) and log practice sessions against each one. I use it daily as a home-screen PWA on my iPhone and in a laptop browser. A small group of friends may join later (invite-only), and maybe more people after that.

**Guiding rule: build for one user, keep the multi-user seams.**
- Every row keeps a `user_id` with owner-only RLS.
- All data access goes through `src/lib/queries/`.
- Each external service sits behind one module.
- Never hard-code a user id, and never loosen RLS "because it's just me."

Plans:
- Stack decisions + staged roadmap: `~/.claude/plans/can-you-look-at-wild-feather.md`
- Feature slices: `~/.claude/plans/i-am-building-a-agile-hopper.md`

## Hard constraints
- **$0 budget.** Free tiers only. No paid services, no Apple $99 fee.
- **Pleasant to use daily on iPhone.** Light and dark themes that follow the system setting, one brand color (teal), smooth sheets, empty states. It must feel right as an installed PWA: safe areas, no zoom on input focus, 44px tap targets.
- **TypeScript everywhere**, strict mode. No `any` without a comment explaining why.
- **Keep it small.** Pick the simplest thing that works, unless it would force a data migration or a rewrite when friends join.

## Stack
- **App:** Vite + React 19 + TypeScript, React Router (`createBrowserRouter`), a static SPA.
- **PWA:** `vite-plugin-pwa` (manifest, service worker, auto-update). iOS meta tags are in `index.html`.
- **UI:** Tailwind CSS v4 (tokens in `src/theme/tokens.css`), `lucide-react`, `vaul` for bottom sheets.
- **Data:** TanStack Query, with optimistic updates for library/status/progress mutations.
- **Forms:** `react-hook-form` (`register`) + `zod`.
- **Backend:** Supabase: Postgres, Auth, RLS. There is no custom server.
- **Auth:** invite-only email + password (`signInWithPassword`).
  - No magic links or emailed codes: on iOS a link opens Safari, which doesn't share storage with the home-screen app, and hosted email is rate-limited.
  - Accounts are created from the Supabase dashboard, and sign-ups are disabled.
- **Song data:** MusicBrainz + Cover Art Archive, called **from the browser** (both send CORS `*`). New catalog songs go through the `add_musicbrainz_song` RPC.
- **Tests:** Vitest for pure logic. pgTAP for schema/RLS.
- **Hosting:** `npm run build` → Cloudflare Pages (free, SPA fallback is automatic).

## Layout
```
index.html                 iOS PWA meta, viewport-fit=cover
vite.config.ts             React, Tailwind, PWA manifest, @ alias, Vitest
src/
  main.tsx                 QueryClientProvider → AuthProvider → RouterProvider
  router.tsx               route table
  routes/                  guards (RequireSession/GuestOnly), TabsLayout (Home / Log / My List), pages; Profile is reached from the header icon
  lib/supabase.ts          Supabase client (localStorage session)
  lib/database.types.ts    hand-written DB types (regenerate once linked)
  lib/musicbrainz.ts       the only MusicBrainz caller: query building, mapping, dedupe/ranking, rate limit
  lib/library.ts           pure library logic: SongCandidate, findEntry, filterLibrary, parseCustomQuery, status labels
  lib/queries/             TanStack Query hooks (useSession, useSignIn, useSignOut, useLibrary, useLogSong, useUpdateEntry, useRemoveEntry, useSongSearch)
  lib/schemas/             zod schemas (auth, entry details, custom song)
  components/ui/           primitives (Button, Screen, TextField, TextArea, Sheet, Chip, CoverArt)
  components/              shared pieces: SongSheet (the song mini page: log, edit, remove), LogButton, EntryDetailsForm, SongRow, ProfileButton
  theme/                   tokens.css (Tailwind @theme, light + dark) + colors.ts (for non-CSS consumers); keep them in sync
public/                    icons, favicon (generated, don't edit by hand)
assets/                    icon.svg: the icon source; `npm run icons` renders it into public/ (favicon included)
supabase/
  migrations/*.sql         0001_init (squashed baseline: tables, RLS, triggers, add_musicbrainz_song)
  tests/*.test.sql         pgTAP
```

## Conventions
- Pages don't call Supabase directly. All reads and writes go through hooks in `src/lib/queries/`.
- Colors come from theme tokens (`bg-button`, `text-muted`…). No hex values and no Tailwind palette colors (`bg-teal-500`, `text-gray-400`) in components. See **Design** below.
- Build pages from `src/components/ui/` primitives. Extend a primitive rather than styling one page ad hoc.
- Pure logic (status transitions, streaks, stats, MusicBrainz mapping) goes in plain TS modules with a `*.test.ts` next to it.
- Every way of adding a song produces a `SongCandidate` and goes through `useLogSong()`. A new source (import, shared link) adds a candidate producer, not a second write path.
- Data is small per user. Load a user's whole library and sessions once, then filter, sort, and compute stats on the client.
- Schema changes are **always** a new migration file. Never edit a migration once it has been pushed to the hosted project.
- Env vars are `VITE_*`, and everything with that prefix ships in the bundle.

## Design
The palette below is the whole color system. New UI uses these tokens and nothing else. If a design needs a color that isn't here, add a token (light and dark) to `src/theme/tokens.css` and `src/theme/colors.ts` and to this table, rather than reaching for a one-off value.

| Token | Light | Dark | Use for |
| --- | --- | --- | --- |
| `background` | `#F6F8F8` | `#101615` | Page background |
| `surface` | `#FFFFFF` | `#1A2221` | Cards, list rows, inputs, tab bar, sheets |
| `border` | `#E1E7E7` | `#2A3433` | 1px outlines on surfaces, dividers |
| `text` | `#142221` | `#EAF1F0` | Primary text |
| `muted` | `#5B6B6A` | `#9AAAA8` | Secondary text, labels, inactive tabs, placeholders |
| `brand` | `#1F9E9A` | `#3CC4BE` | Brand teal: icons, logo, focus rings, progress fills. Not for small text or button fills in light mode (too little contrast) |
| `brand-soft` / `on-brand-soft` | `#E0F4F3` / `#0D5754` | `#133A38` / `#7EE0DA` | Selected pill or tab, and the text/icon on it |
| `button` / `on-button` | `#167F7B` / `#FFFFFF` | `#3CC4BE` / `#08302E` | Primary button fill and its label |
| `danger` | `#C2343F` | `#FF7A85` | Errors, destructive actions |
| `scrim` | `#142221` | `#000000` | Dimmed backdrop behind a sheet, always at reduced opacity (`bg-scrim/50`) |
| `status-want` / `on-status-want` | `#FFF0D6` / `#8A5A00` | `#3A2E12` / `#F5C46A` | "Want to learn" chip |
| `status-learning` / `on-status-learning` | `#E0F4F3` / `#0D5754` | `#133A38` / `#7EE0DA` | "Learning" chip |
| `status-learned` / `on-status-learned` | `#E6EAF7` / `#33408A` | `#222A45` / `#A9B4F0` | "Learned" chip |
| `status-shelved` / `on-status-shelved` | `#E9EDED` / `#5B6B6A` | `#242D2C` / `#9AAAA8` | "Shelved" chip |

- Tokens are Tailwind utilities: `bg-surface`, `text-muted`, `border-border`, `bg-status-want text-on-status-want`.
- **Don't use `dark:` variants for color.** The tokens switch on `prefers-color-scheme` by themselves, so one class covers both modes. Check every new screen in both.
- Always pair a fill with its `on-` token (`bg-button text-on-button`). `src/theme/colors.test.ts` checks these pairs meet WCAG AA and that `tokens.css` and `colors.ts` agree.
- Shapes: page on `background`; content in `surface` cards with a 1px `border` and generous radius (`rounded-2xl` rows, `rounded-3xl` containers); buttons and inputs `rounded-xl`; chips and pills `rounded-full`.
- Teal is the only brand color. Amber and indigo appear only in the status chips.
- The app icon (`assets/icon.svg`) uses the same teal. Re-render with `npm run icons` after changing it.

## Data model
- `profiles`: `id` → `auth.users`, `username`, `display_name`, `avatar_url`. Created by a signup trigger and public-read. Unused by the UI until the friends stage.
- `songs`: a **shared catalog**, so the same song is the same row for everyone.
  - `source` is `musicbrainz` | `custom`.
  - MusicBrainz rows: unique `mbid`, no `created_by`. Written only by `add_musicbrainz_song()`. The RPC validates input, only accepts coverartarchive.org cover URLs, and only fills missing metadata.
  - Custom rows: `created_by`, private to their creator.
- `user_songs`: one row per user per song (`unique(user_id, song_id)`).
  - `status` enum: `want_to_learn`, `learning`, `learned`, `shelved`.
  - Other columns: `progress` 0–100, `difficulty` 1–5, `tuning`, `capo`, `notes`, `tab_url`, `video_url`, `started_at`, `learned_at`, `updated_at`.
- `practice_sessions`: `user_song_id`, `practiced_at`, `duration_min`, `focus` (riff/solo/rhythm/full_song), `notes`, `progress_after`.
- A trigger sets `learned_at` when status becomes `learned`, and `started_at` when status becomes `learning` or `learned`.
- Social features later (follows, ratings, friend libraries) are **additive** tables and policies, with no data migration.

## Security (RLS is the boundary; the anon key is public)
- Every table has RLS enabled.
- `user_songs`, `practice_sessions`: owner-only CRUD (`user_id = auth.uid()`).
- `songs`:
  - `musicbrainz` rows are readable by every authenticated user. Clients can't insert them directly, only through the RPC.
  - `custom` rows are CRUD for their creator only.
  - `user_songs` can only reference songs the user can see.
- `profiles`: public read, owner write.
- Sign-ups and anonymous sign-ins are off: `[auth] enable_signup = false` locally, and the same toggles in the hosted dashboard.
  - Don't set `[auth.email] enable_signup = false`: that disables email login entirely.
- The service-role/secret key never goes in the app or in `VITE_*`.

## MusicBrainz rules
- Call it only through `src/lib/musicbrainz.ts`. That module is the swap point for a `search-songs` edge function if the app grows.
- Debounce search input (≥400 ms) and never fire requests in a loop. The limit is 1 req/s per IP.
- Cover art: Cover Art Archive `front-250` URLs, with a placeholder when missing.
- If MusicBrainz has no match, fall back to the custom-song form.

## Commands
- `npm run dev`: dev server (http://localhost:5173)
- `npm run typecheck`: `tsc --noEmit`
- `npm test`: Vitest (`vitest run`)
- `npm run build`: typecheck + production build to `dist/` (includes the service worker)
- `npm run preview`: serve the production build
- `npm run icons`: re-render the PNG icons in `public/` from `assets/*.svg`
- `supabase start` / `supabase migration up --local`: local stack + apply new migrations. `supabase db reset` wipes local data.
- `supabase test db`: pgTAP
- `supabase db push`: apply migrations to the hosted project (confirm first)
- Local sign-in: create a user with a password (Auto Confirm) in local Studio (http://127.0.0.1:54323).

## Testing
- Test-first is **not** required.
- Write Vitest tests for pure logic.
- Update pgTAP with every migration.
- Don't weaken or delete a test to make it pass. If a test's premise is wrong, say so and ask first.

## Verifying changes
- Always: `npm run build` (typecheck + build) and `npm test`.
- Schema/RLS changes: `supabase migration up --local` + `supabase test db`.
- UI changes: check in a desktop browser at phone width, and on the iPhone home-screen PWA when layout, safe areas, or storage are involved.
- Manual smoke flow:
  1. Sign in with email + password inside the PWA.
  2. Search "Wonderwall" and add it as Learning.
  3. Set progress and links.
  4. Log a session.
  5. Mark it Learned.
  6. Check that the stats update.
  7. Force-quit, reopen, and confirm you're still signed in with the data intact.

## Out of scope (don't build unless asked)
- Open sign-ups
- Social/follows/feed
- Beli-style ranking
- App Store/Capacitor builds
- Push notifications
- Sentry/analytics

Friends-stage items (custom SMTP, invites, Sentry) are listed in the plan.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
