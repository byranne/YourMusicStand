# MusicStand

The product name is **MusicStand** (formerly MALguitar; the repo folder, npm package and Supabase project id still say `malguitar`).

"MyAnimeList / Beli for guitarists." A **personal tool first**: I keep a library of songs (want to learn / learning / learned / shelved) and log practice sessions against each one. I use it daily as a home-screen PWA on my iPhone and in a laptop browser. It is also posted publicly: anyone can make an account to try it and give feedback.

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
- **Data:** optimistic updates for library/status/progress mutations.
- **Backend:** Supabase: Postgres, Auth, RLS. There is no custom server.
- **Auth:** open email + password sign-up (`/sign-up`) and sign-in (`/sign-in`), both behind a Cloudflare Turnstile check.
  - Nothing is emailed: no confirmation, no magic links, no reset codes. On iOS a link opens Safari, which doesn't share storage with the home-screen app, and hosted email is rate-limited.
  - So there is no forgot-password flow. A signed-in user changes their password in the Account sheet; a lost one is reset from the Supabase dashboard.
  - The Turnstile widget only renders when `VITE_TURNSTILE_SITE_KEY` is set. Local development leaves it empty and the local stack asks for no captcha.
- **Song data:** MusicBrainz + Cover Art Archive, called **from the browser** (both send CORS `*`). New catalog songs go through the `add_musicbrainz_song` RPC.
- **Cover caching:** only covers of what you've saved (library songs, jamlists, your photo) are kept on the device, in the `covers` Cache Storage cache. `CoverPreloader` fills and prunes it (`keepCovers` in `src/lib/coverImages.ts`); the service worker (`workbox.runtimeCaching` in `vite.config.ts`) only reads it and never stores what it fetches, so search covers aren't kept. Signed Storage links are keyed without their token (`coverCacheKey`). Sign-out clears it.
- **Hosting:** `npm run build` → Cloudflare Pages (free, SPA fallback is automatic).

## Conventions
- Pages don't call Supabase directly. All reads and writes go through hooks in `src/lib/queries/`.
- Colors come from theme tokens (`bg-button`, `text-muted`…). No hex values and no Tailwind palette colors (`bg-teal-500`, `text-gray-400`) in components. See **Design** below.
- Build pages from `src/components/ui/` primitives. Extend a primitive rather than styling one page ad hoc.
- Pure logic (status transitions, streaks, stats, MusicBrainz mapping) goes in plain TS modules with a `*.test.ts` next to it.
- Four tabs, one job each: Home (`/`, Start practice and this week's stats), My Log (`/log`, all-time stats and practice sessions; `/log?session=<id>` opens one), My List (`/list`: a fanned arc of learned covers (the "Learned library", or a mascot card while empty), jamlists, then Learning, Want to learn and Shelved; search and a filter sheet turn it into one flat list) and Add (`/add`, search and add songs). Links meant for adding a song go to `/add`.
- Account is a sheet opened from the header avatar (`AccountButton`), not a route. It holds profile (avatar, name), appearance (theme, background), the weekly goal, password and sign out.
- A picked photo (avatar or cover) opens `ImageCropper` in a nested sheet; nothing uploads until it is confirmed. The crop math is in `src/lib/crop.ts`.
- Every way of adding a song produces a `SongCandidate` and goes through `useLogSong()`. A new source (import, shared link) adds a candidate producer, not a second write path.
- Data is small per user. Load a user's whole library and sessions once, then filter, sort, and compute stats on the client.
- Schema changes are **always** a new migration file. Never edit a migration once it has been pushed to the hosted project.
- Env vars are `VITE_*`, and everything with that prefix ships in the bundle.
- `public/` icons and favicon are generated from `assets/icon.svg`. Don't edit them by hand.
- `src/lib/queries/resourceFiles.ts` is the only Supabase Storage caller.
- `src/lib/database.types.ts` is hand-written (regenerate once the project is linked).
- `src/theme/tokens.css` and `src/theme/colors.ts` must stay in sync.

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
| `face` | `#142221` | `#08302E` | The mascot's eyes and mouth. Nothing else |
| `blush` | `#FFB4A8` | `#FF8A7A` | The mascot's cheeks, at reduced opacity. Nothing else |
| `streak` | `#E8590C` | `#FF8A4C` | The streak flame icon. Nothing else |
| `streak-core` | `#FFB547` | `#FFD08A` | The flame's inner core. Nothing else |
| `streak-soft` / `on-streak-soft` | `#FFE8D9` / `#8A3A00` | `#3D2414` / `#FFB58A` | Streak badge behind the flame, and the count on it |
| `status-want` / `on-status-want` | `#FFF0D6` / `#8A5A00` | `#3A2E12` / `#F5C46A` | "Want to learn" chip |
| `status-learning` / `on-status-learning` | `#E0F4F3` / `#0D5754` | `#133A38` / `#7EE0DA` | "Learning" chip |
| `status-learned` / `on-status-learned` | `#E6EAF7` / `#33408A` | `#222A45` / `#A9B4F0` | "Learned" chip |
| `status-shelved` / `on-status-shelved` | `#E9EDED` / `#5B6B6A` | `#242D2C` / `#9AAAA8` | "Shelved" chip |

- Tokens are Tailwind utilities: `bg-surface`, `text-muted`, `border-border`, `bg-status-want text-on-status-want`.
- **Don't use `dark:` variants for color.** The tokens switch by themselves under `data-theme="dark"` on `<html>`, so one class covers both modes. Check every new screen in both.
- `data-theme` follows the system unless the person picks Light or Dark in the Account sheet. That choice is per device (`src/lib/theme.ts`, localStorage), and an inline script in `index.html` applies it before first paint.
- Page backgrounds (`plain` / `dots` / `staff` / `wash`) are drawn in `src/index.css` from tokens only, as a fixed layer behind the page (`html[data-bg]`). Surfaces stay opaque.
- Always pair a fill with its `on-` token (`bg-button text-on-button`). `src/theme/colors.test.ts` checks these pairs meet WCAG AA and that `tokens.css` and `colors.ts` agree.
- Shapes: page on `background`; content in `surface` cards with a 1px `border` and generous radius (`rounded-2xl` rows, `rounded-3xl` containers); buttons and inputs `rounded-xl`; chips and pills `rounded-full`.
- Teal is the only brand color. Amber and indigo appear only in the status chips, and orange only in the streak flame.
- The app icon (`assets/icon.svg`) uses the same teal. Re-render with `npm run icons` after changing it.

## Data model
- `profiles`: `id` → `auth.users`, `username`, `display_name`, `avatar_url` (unused), `avatar_preset`, `avatar_path`. Created by a signup trigger and public-read.
  - The Account sheet sets `display_name` (Home greets by its first word) and the avatar.
  - The avatar is a preset key (`src/lib/avatars.ts`, matching the column's check) or an uploaded photo at `avatar_path` (`{user_id}/avatar/{random}.jpg` in the `resources` bucket, cropped in the cropper and shrunk to 256 px JPEG, counted in the 50 MB). Initials show when there is neither.
- `user_settings`: owner-only, one row per user created by the first upsert (a missing row means the defaults): `weekly_goal_min` (null = no goal, otherwise 10–3000) and `background`.
- `songs`: a **shared catalog**, so the same song is the same row for everyone.
  - `source` is `musicbrainz` | `custom`.
  - MusicBrainz rows: unique `mbid`, no `created_by`. Written only by `add_musicbrainz_song()`. The RPC validates input, only accepts coverartarchive.org cover URLs, and only fills missing metadata.
  - Custom rows: `created_by`, private to their creator. `songs.cover_path` is retired (0008 moved it to `user_songs`).
- `user_songs`: one row per user per song (`unique(user_id, song_id)`).
  - `status` enum: `want_to_learn`, `learning`, `learned`, `shelved`.
  - `cover_path`: the user's own cover for this entry, on any song (catalog or custom), at `{user_id}/covers/{random}.jpg` in the `resources` bucket, cropped square and shrunk to 600 px JPEG, counted in the 50 MB. The library query fills `song.cover_url` with its signed URL for display (never written back); signed cover URLs are kept in localStorage so relaunches hit the HTTP cache.
  - Other columns: `progress` 0–100, `notes`, `started_at`, `learned_at`, `updated_at`. `difficulty`, `tuning` and `capo` still exist but the UI no longer uses them.
- `resources`: the links and files kept on a library entry (`user_song_id`), loaded with the library.
  - `kind` is `link` | `file`. A link has an http(s) `url`; a file has a `storage_path` plus `mime_type` and `size_bytes`.
  - Files live in the private `resources` storage bucket (20 MB per file) at `{user_id}/{user_song_id}/{random}.{ext}` and are opened through signed URLs.
  - Each account may store 50 MB in total. The bucket's upload policy enforces it from what Storage recorded (`resource_bytes_used()`), and the app checks the exact total first (`MAX_TOTAL_FILE_BYTES`). Videos are meant to go in as links.
  - Rows are added or removed, never updated. They cascade with the entry; the app deletes the files itself.
- `jamlists`: a user's named, ordered groups of library entries (`name` 1–60, optional `cover_path` at `{user_id}/covers/{random}.jpg`; without one the first song's cover shows). `jamlist_songs` (`jamlist_id`, `user_song_id`, `user_id`, `position`; PK on the first two) cascades with both sides. Its rows are written only by `set_jamlist_songs(jamlist_id, ids[])` (`security invoker`), which rewrites the whole ordered list.
- `practice_sessions`: one sitting that can cover several songs: `practiced_at` (start time), `duration_sec` (what is stored; `duration_min` is a generated whole-minute column that the stats read), `feel` (`practice_feel`: `rough` | `okay` | `great`), `notes`.
- `practice_session_songs`: which `user_songs` a session covered (`session_id`, `user_song_id`, `user_id`; primary key on the first two). Cascades with both sides, so deleting a library entry keeps the session.
- Sessions are written only by the `log_practice_session()` RPC (`security invoker`, so RLS applies), which saves the session and its songs in one transaction.
- Practice can start from Home, a song sheet or a jamlist (`startWith(ids)` pre-ticks those songs).
- The running session is **not** in Supabase: it lives in `localStorage` (`src/lib/activeSession.ts`, key includes the user id) as `startedAt` / `lastSeenAt` / opened songs plus `pausedAt` / `pausedMs` for the pause button (paused time is left out of the duration), and is written to the database only when the recap is saved.
- There is no per-song progress number any more. Improvement is shown as days played, time and per-song totals (`src/lib/stats.ts`). The `progress` column still exists but the UI doesn't use it.
- A trigger sets `learned_at` when status becomes `learned`, and `started_at` when status becomes `learning` or `learned`.
- Social features later (follows, ratings, friend libraries) are **additive** tables and policies, with no data migration.

## Security (RLS is the boundary; the anon key is public)
- Every table has RLS enabled.
- `user_songs`, `practice_sessions`: owner-only CRUD (`user_id = auth.uid()`).
- `user_settings`: owner-only select/insert/update.
- `practice_session_songs`: owner-only select/insert/delete; insert also requires that the session and the `user_songs` row both belong to the owner.
- `resources`: owner-only select/insert/delete, and only on the owner's own `user_songs`.
- `jamlists`: owner-only CRUD. `jamlist_songs`: owner-only select/insert/delete; insert also requires that the jamlist and the `user_songs` row both belong to the owner.
- Storage bucket `resources` is private. Its `storage.objects` policies confine each user to the folder named after their user id.
- `songs`:
  - `musicbrainz` rows are readable by every authenticated user. Clients can't insert them directly, only through the RPC.
  - `custom` rows are CRUD for their creator only.
  - `user_songs` can only reference songs the user can see.
- `profiles`: public read, owner write.
- Sign-ups are open, so every account is a stranger's: RLS and the storage policies are the only thing between users. Anonymous sign-ins stay off.
  - Hosted dashboard: "Allow new users to sign up" on, "Confirm email" off, Turnstile captcha on, minimum password length 8. `supabase/config.toml` mirrors this except for the captcha.
  - Don't set `[auth.email] enable_signup = false`: that disables email login entirely.
  - Only the Turnstile site key goes in `VITE_*`. Its secret key lives in the Supabase dashboard.
- The service-role/secret key never goes in the app or in `VITE_*`.

## MusicBrainz rules
- Call it only through `src/lib/musicbrainz.ts`. That module is the swap point for a `search-songs` edge function if the app grows.
- Debounce search input (≥400 ms) and never fire requests in a loop. The limit is 1 req/s per IP.
- Cover art: Cover Art Archive `front-250` URLs, with a placeholder when missing.
- If MusicBrainz has no match, fall back to the custom-song form.

## Commands
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
  1. Create an account inside the PWA: Home shows the welcome card. Change the password in the Account sheet, sign out, and sign back in.
  2. Search "Wonderwall" (Add tab) and add it as Learning.
  3. Add a link and a file, open both, and write a note.
  4. On Home tap Start practice, open the song and a resource, return: the timer kept counting.
  5. Tap Stop: the recap pre-ticks the song. Pick a feel and save.
  6. Home shows today's bar, a lit 1-day streak, the week's minutes, the song under Top songs this week and the session under Recent sessions; the song sheet shows its practice totals. Tap the session: My Log opens with its details, and shows the all-time totals above the sessions.
  7. Mark it Learned.
  8. Force-quit during a session, reopen, and confirm it's still running and you're still signed in with the data intact.

## Out of scope (don't build unless asked)
- Forgot-password or any other emailed flow
- Deleting your own account from the app
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
