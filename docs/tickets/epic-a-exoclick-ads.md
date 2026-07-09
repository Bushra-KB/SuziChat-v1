# Epic A — ExoClick Ad Integration

One ticket per branch. Ticket order and dependencies are in
[`../PROJECT_ROADMAP.md`](../PROJECT_ROADMAP.md).

**Cross-cutting facts (from repo analysis):**
- No ads/CSP exist today — clean slate.
- App shell (global chrome): `apps/web/src/components/app/app-shell.tsx`.
- Feeds are **circular carousels/decks**, so "every 20 items" = splice ad items
  into the source array, not DOM position.
- Mobile is a **static export** (`output: export`); `next/script` works but keep
  ad bootstrapping in a small client component to be safe.
- ExoClick serves via `https://a.magsrv.com/ad-provider.js` + per-zone
  `<ins data-zoneid="…">` + `(AdProvider = window.AdProvider || []).push({serve:{}})`.

**Credentials:** never commit the ExoClick login. Code needs only **Zone IDs** via
env vars.

---

## A0 — Ad infrastructure (foundation)

- **Branch:** `feat/ads-exoclick-foundation`
- **Priority:** P0 (everything else depends on it)
- **Depends on:** none

**Goal:** one reusable ad system: load the ExoClick provider script once, expose a
`<ExoClickZone>` React component, centralize Zone IDs in env, and add a global
kill switch.

**Files to create/touch:**
- `apps/web/src/lib/ads-config.ts` (new) — read env, expose zone IDs + `adsEnabled`.
- `apps/web/src/components/ads/exoclick-provider.tsx` (new) — inject
  `ad-provider.js` once (client component; mount high in the tree).
- `apps/web/src/components/ads/exoclick-zone.tsx` (new) — renders `<ins
  data-zoneid>` and pushes `AdProvider.serve` on mount; re-serves on route change;
  renders nothing when `adsEnabled` is false or the zone id is missing.
- `apps/web/src/components/ads/ad-banner.tsx` (new) — thin wrapper choosing the
  right zone id for a slot (`top` | `bottom` | `feed`) and applying banner styling
  (safe-area aware).
- `apps/web/src/app/layout.tsx` — mount `<ExoClickProvider>` inside `<body>`
  (around line 23) so the script loads for every route group.
- `.env.example` and `apps/web/.env.example` — document the new env vars.

**Env vars (set real Zone IDs after creating zones in ExoClick):**
```
NEXT_PUBLIC_ADS_ENABLED=true
NEXT_PUBLIC_EXOCLICK_ZONE_BANNER_TOP=
NEXT_PUBLIC_EXOCLICK_ZONE_BANNER_BOTTOM=
NEXT_PUBLIC_EXOCLICK_ZONE_REELS=
NEXT_PUBLIC_EXOCLICK_ZONE_SNAPS=
NEXT_PUBLIC_EXOCLICK_ZONE_DATING=
```
(For the mobile build, add these to the `cross-env` line in
`apps/web/package.json` `build:mobile` / `cap:sync`, or a `.env.production`.)

**Steps:**
1. Create the ExoClick account zones first (banner sizes + a feed/native format).
   Note each Zone ID. (Ops — can be stubbed while coding with placeholder ids.)
2. Build `ExoClickProvider`: append the `ad-provider.js` script tag once
   (guard against double-injection like the existing Google button loader in
   `apps/web/src/components/auth/google-auth-button.tsx:32`).
3. Build `ExoClickZone`: render the `<ins class="…" data-zoneid={id}>` and, in a
   `useEffect`, push `{serve:{}}`; key it so SPA navigation re-serves.
4. Build `AdBanner` + `ads-config.ts`; wire the provider into the root layout.
5. Verify a placeholder zone renders on web (`pnpm --filter web dev`).

**Acceptance criteria:**
- With `NEXT_PUBLIC_ADS_ENABLED=false`, no ad DOM or script loads.
- With a valid zone id, a test banner renders and refreshes on route change.
- Typecheck + lint + web build pass.

**Store notes:** this ticket introduces the ad SDK → it triggers B1/B2/B3/B4. Do
not submit any build until those land.

---

## A7 — Configure ExoClick zones for store-safe creatives

- **Branch:** n/a (ExoClick dashboard config) — record settings in this doc / a
  `docs/exoclick-zones.md`.
- **Priority:** P0 (compliance-critical; do alongside A0)
- **Depends on:** ExoClick account

**Goal:** ensure creatives served in the apps are store-appropriate so "ExoClick
everywhere" can pass review.

**Steps (in the ExoClick dashboard):**
1. Create separate zones for **app/native** vs **web** if you want different
   policies.
2. For the app zones, restrict **ad categories to mainstream / non-adult**.
3. Enable **category blocking** and **keyword/advertiser blocking** for explicit
   content.
4. Prefer **safe** ad formats (standard display banners) over pop/interstitial
   redirect formats, which stores treat as deceptive.
5. Record the final zone IDs + category settings in `docs/exoclick-zones.md`.

**Acceptance criteria:** a reviewer opening the app sees only non-explicit ads.

---

## A1 — Global top & bottom banners (app shell)

- **Branch:** `feat/ads-app-shell-banners`
- **Depends on:** A0

**Goal:** a small banner at the top and bottom of every **in-app** page (covers
home, reels, snaps, dating, games, rooms, profile, settings, messages, etc.,
since they all render inside the shell).

**Files to touch:** `apps/web/src/components/app/app-shell.tsx`
- Desktop: mount `<AdBanner slot="top"/>` between the header (ends ~line 1260) and
  the content-fill div (`.suzi-app-frame-fill`, lines 1305-1316); mount
  `<AdBanner slot="bottom"/>` just above/inside the desktop footer (lines
  1318-1352).
- Mobile: mount top banner below the mobile top bar (lines 583-766) and bottom
  banner **above** `.suzi-m-bottom` nav (line 1365), respecting
  `env(safe-area-inset-bottom)`.

**Acceptance criteria:** top+bottom banners appear on every `(app)` route without
overlapping the nav or content; hidden when ads disabled.

**Store notes:** keep banners from covering interactive UI or the notch/home
indicator (Apple 4.x layout; Google disruptive-ads policy).

---

## A2 — Banners on public / unauthenticated pages

- **Branch:** `feat/ads-public-pages`
- **Depends on:** A0

**Goal:** top+bottom banners on pages outside the app shell.

**Files to touch:**
- Auth: `apps/web/src/app/(auth)/layout.tsx` (children at line 95).
- Landing: `apps/web/src/app/page.tsx`.
- Legal/shared: the shared `LegalPage` component used by
  `apps/web/src/app/privacy/page.tsx`, `terms/page.tsx`, `help/page.tsx`,
  `data-deletion/page.tsx`, `child-safety/page.tsx` — add banners once in
  `LegalPage` to cover all of them.

**Acceptance criteria:** every public route shows top+bottom banners.

**Store notes:** do NOT place ads on screens Apple dislikes seeing monetized
around sensitive flows; keep the **login/register** ad unobtrusive. Never place
ads on the **Delete Account** confirmation screen.

---

## A3 — Banners in chat rooms & games

- **Branch:** `feat/ads-rooms-games`
- **Depends on:** A0, A1

**Goal:** guarantee banners in the chat-room and games experiences specifically
(some open as near-fullscreen views that may bypass shell chrome).

**Files to touch/verify:**
- Rooms: `apps/web/src/components/app/room-chat-view.tsx`,
  `apps/web/src/components/app/rooms-catalog-page-client.tsx`,
  `apps/web/src/components/app/home-chat-rooms-panel.tsx`.
- Games: `apps/web/src/app/(app)/app/page.tsx` (games sections ~lines 150-221 /
  313-348 / 375-446), `apps/web/src/components/app/game-lobby-entry.tsx`, and
  `apps/web/src/app/(app)/app/games/[gameId]/session`.

**Steps:** first confirm whether A1's shell banners already show here. If a view
hides the shell (fullscreen room/game), add explicit top+bottom `<AdBanner>` to
that view.

**Acceptance criteria:** banners visible in the rooms catalog, an open room chat,
the games list, and an open game.

**Store notes:** ads must not overlap the live video/game surface or call
controls.

---

## A4 — Inline ad after every 20 reels

- **Branch:** `feat/ads-reels-every-20`
- **Depends on:** A0

**Goal:** an ad card appears as every 21st slide (after each block of 20 reels).

**Files to touch:** `apps/web/src/components/app/reels-feed.tsx`
- Data: `displayReels` state (line 279), populated in the load `.then` (lines
  ~375-411). Add a helper `interleaveAds(items, 20)` that returns a
  discriminated union `Array<{type:'reel', reel} | {type:'ad', id}>`.
- Render: the map at line 1345 branches — render `<AdCard zone={REELS}>` for ad
  items, existing card for reels. Ad items participate in `getCircularOffset` /
  `advanceCarouselIndex` as normal slides.
- Keep `discoveryItems` (line 318) and view-tracking (`trackPostView`) **skipping
  ad items** so analytics/likes aren't corrupted.

**Acceptance criteria:** with ≥21 reels, an ad slide sits after the 20th; swiping
lands on it; real reels still play/like/comment normally.

---

## A5 — Inline ad after every 20 snaps

- **Branch:** `feat/ads-snaps-every-20`
- **Depends on:** A0 (mirror A4)

**Files to touch:** `apps/web/src/components/app/snaps-feed.tsx`
- Data: `displaySnaps` (line 233), load `.then` (lines ~318-344).
- Render: map at line 1126 branches to `<AdCard zone={SNAPS}>`.
- Skip ad items in `discoveryItems` (line 269) and view tracking.

**Acceptance criteria:** ad card after every 20 snaps; real snaps unaffected.

---

## A6 — Inline ad after every 20 dating profiles

- **Branch:** `feat/ads-dating-every-20`
- **Depends on:** A0

**Files to touch:**
- `apps/web/src/components/app/dating-hub.tsx` — `deck` state (line 76), loaded via
  `discoverDating` (lines ~159-172, 199-206). Interleave ad cards every 20.
- `apps/web/src/components/app/dating/dating-discover-deck.tsx` — render an ad card
  for ad items (`activeCard = deck[activeIndex]`, line 64; uses
  `getCircularOffset`/`getLayerForOffset`). Ensure swipe (`onRotate`) treats an ad
  as a neutral card — a swipe should just advance, **not** record a like/pass
  (`datingSwipe`).

**Acceptance criteria:** an ad card appears after every 20 profiles; swiping past
it does not create a swipe/match record.

**Store notes:** dating flows are sensitive — keep ads clearly separated from
profile actions to avoid accidental taps (Google disruptive-ads).

---

## Shared component to build in A0 and reuse

`AdCard` (feed ad, styled like a reel/snap/dating card, wraps `<ExoClickZone>`
with the feed zone id) and `AdBanner` (top/bottom strip). Both must render
nothing when `adsEnabled` is false so tests and ad-free contexts stay clean.
