# Suzi Chat — Project Roadmap: Ad Monetization + Store Acceptance

Last updated: 2026-07-09

This roadmap drives Suzi Chat to two outcomes:

1. **Monetize with ExoClick** — top + bottom banner ads on every open page (incl.
   public chat rooms and the games section) and an inline ad after every 20
   reels, snaps, and dating profiles.
2. **Get the iOS and Android apps accepted** — close the App Store / Google Play
   compliance gaps that have caused rejections, including the new obligations
   that come with running an ad network.

We work **one ticket per branch**. Tickets are specified in:
- [`docs/tickets/epic-a-exoclick-ads.md`](tickets/epic-a-exoclick-ads.md)
- [`docs/tickets/epic-b-store-compliance.md`](tickets/epic-b-store-compliance.md)

Related existing docs: [`docs/APPLE_APP_STORE_COMPLIANCE.md`](APPLE_APP_STORE_COMPLIANCE.md).

---

## 0. Decision record & the #1 risk (read first)

**Decision (owner: client):** ExoClick ads run **everywhere — web AND the native
iOS/Android apps.**

**Honest risk assessment:** ExoClick is primarily an **adult** ad network. Both
Apple and Google hold the *app developer* responsible for everything an ad
network serves inside the app:

- **Apple** — "You are responsible for making sure everything in your app
  complies with these guidelines, including ad networks… so review and choose
  them carefully." Pornographic/inappropriate ad creatives → rejection or
  removal. Suzi Chat is already under heightened scrutiny as a dating / live-chat
  user-generated-content app (Guideline 1.2). Any ad SDK also now requires a
  privacy manifest.
- **Google Play** — "If a third-party SDK or library in your app collects or
  shares user data, you must reflect this collection and sharing in the Data
  safety form," and inappropriate ads are prohibited. You are responsible for the
  ad SDK's behavior and permissions.

**What this means:** the ad *integration* can be made technically compliant
(privacy manifest, ATT, AD_ID, Data Safety). The remaining and largest risk is
the **ad creatives themselves**. If ExoClick serves explicit ads inside the apps,
they will very likely be rejected/removed regardless of how clean the code is.

**Required mitigation (Ticket A7 — non-optional if store approval matters):**
configure the ExoClick ad **zones** used by the apps to serve **mainstream /
non-adult** categories only, with **category + keyword blocking** enabled. This
is how "ExoClick everywhere" and "apps accepted" can both be true. If the client
insists on explicit ad categories inside the native apps, treat store approval as
**unlikely** and plan for web/PWA distribution of the ad-heavy experience.

> Credentials note: the ExoClick username/password stay in a password manager or
> CI secret store — **never in the repo**. The code only needs **Zone IDs**,
> supplied via `NEXT_PUBLIC_EXOCLICK_*` environment variables (see Ticket A0).

---

## 1. Current state (from repo analysis)

- **Stack:** Next.js 16 (app router) + Capacitor 8 (iOS/Android) in `apps/web`;
  NestJS + Prisma in `apps/api`. Mobile = static export (`output: export`) served
  from `capacitor://localhost` (iOS) / `https://localhost` (Android).
- **Ads:** none today. No ExoClick, no `next/script`, **no CSP anywhere** — clean
  slate for injecting ad scripts.
- **App shell:** `apps/web/src/components/app/app-shell.tsx` is the persistent
  frame (desktop header/footer + mobile top bar + bottom nav) wrapping the whole
  logged-in product — the natural home for global banners.
- **Feeds:** reels/snaps/dating are **circular carousels/decks** (not linear
  lists), so "ad every 20 items" is done by splicing ad items into the data array,
  not by DOM position.
- **Compliance already in place:** in-app **Delete Account** flow, public
  **data-deletion** page, **privacy/terms/help/child-safety** pages, **Sign in
  with Apple** (merged), age gate at signup (18+). Android `targetSdk = 36`
  (meets Play's API-level bar).
- **Compliance gaps:** no iOS `PrivacyInfo.xcprivacy`; no
  `NSUserTrackingUsageDescription` / ATT; no Android `AD_ID` permission; privacy
  policy mentions "advertising" but does not yet disclose ExoClick specifically;
  UGC safety controls (report/block/EULA/contact) need an audit against Apple 1.2.

---

## 2. Epics & phases

Two epics, sequenced so the ad decision's compliance burden is handled before
submission.

### Phase 0 — Foundations (do first)
| Ticket | Title |
|--------|-------|
| A0 | ExoClick ad infrastructure (provider script + `<ExoClickZone>` component + env config + kill switch) |
| A7 | Configure ExoClick zones for store-safe (mainstream) creatives + blocking |

### Phase 1 — Ad placements
| Ticket | Title |
|--------|-------|
| A1 | Global top & bottom banners in the app shell |
| A2 | Banners on public / unauthenticated pages (landing, auth, legal) |
| A3 | Banners in chat rooms & the games section |
| A4 | Inline ad after every 20 **reels** |
| A5 | Inline ad after every 20 **snaps** |
| A6 | Inline ad after every 20 **dating** profiles |

### Phase 2 — Store compliance (blocks submission)
| Ticket | Title |
|--------|-------|
| B1 | iOS `PrivacyInfo.xcprivacy` privacy manifest |
| B2 | iOS App Tracking Transparency (ATT) + `NSUserTrackingUsageDescription` |
| B3 | Android `AD_ID` permission + target-SDK/edge-to-edge check |
| B4 | Privacy policy + App Store "App Privacy" + Play "Data Safety" ad disclosures |
| B5 | UGC safety controls audit (report / block / EULA / contact) — Apple 1.2 |
| B6 | Age rating questionnaires (Apple 18+, Google IARC) + age-gate verification |

### Phase 3 — Submission & finalize
| Ticket | Title |
|--------|-------|
| B7 | Verified demo account + verification email confirmed working (ties to existing compliance doc) |
| B8 | Rebuild mobile (`cap:sync`), device QA, updated screenshots, version bump, submit |

---

## 3. Dependency order (critical path)

```
A0 ─┬─ A1 ─ A2 ─ A3            (banners)
    ├─ A4  A5  A6              (feed insertions, parallel after A0)
    └─ A7  (zone config — do in parallel, needed before B8 submit)

B1 ─ B2 ─ B3 ─ B4             (ad-driven compliance; needs A0 to know what the SDK does)
B5 ─ B6                        (can run in parallel with B1–B4)
             ↓
B7 ─ B8  (submit) ── requires ALL of A1–A7 and B1–B6 green
```

Recommended build order: **A0 → A7 → A1 → A4/A5/A6 → A2 → A3 → B1 → B2 → B3 → B4
→ B5 → B6 → B7 → B8.**

---

## 4. How we work each ticket

1. `git switch main && git pull`
2. `git switch -c <branch-name>` (branch name is in each ticket)
3. I guide you through the changes step by step; you implement.
4. Typecheck/lint/build locally (`pnpm --filter web exec tsc --noEmit`,
   `pnpm --filter api build`).
5. Commit, push, open PR, merge to `main`, confirm CI deploy is green.
6. For mobile-affecting tickets: after merge, `pnpm --filter web cap:sync` +
   rebuild in Xcode / Android Studio to get changes into the installed apps.

---

## 5. Definition of Done for the whole project

- [ ] ExoClick top + bottom banners visible on every open page (public + in-app,
      chat rooms, games) on web and in both native apps.
- [ ] An ad renders after every 20 reels, snaps, and dating profiles.
- [ ] ExoClick zones configured to serve store-safe creatives (A7).
- [ ] iOS: privacy manifest present; ATT prompt shown; App Privacy answers match
      the SDK; Sign in with Apple working; verified demo account.
- [ ] Android: `AD_ID` declared; Data Safety form matches the SDK; target SDK 35+.
- [ ] Privacy policy discloses ExoClick + data sharing/tracking.
- [ ] UGC safety controls (report/block/EULA/contact) present and functional.
- [ ] Updated screenshots; version/build bumped; both apps submitted and accepted.

---

## 6. Ticket index

See the two epic files for full specs (files-to-touch, steps, acceptance
criteria, testing, store notes):
- [Epic A — ExoClick Ads](tickets/epic-a-exoclick-ads.md) — A0–A7
- [Epic B — Store Compliance](tickets/epic-b-store-compliance.md) — B1–B8
