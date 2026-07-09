# Epic B — App Store & Google Play Acceptance

One ticket per branch. Order/dependencies in
[`../PROJECT_ROADMAP.md`](../PROJECT_ROADMAP.md). Builds on
[`../APPLE_APP_STORE_COMPLIANCE.md`](../APPLE_APP_STORE_COMPLIANCE.md) (Sign in with
Apple, Birthday/Gender optional, email verification, demo account).

**Why these tickets exist:** adding an ad SDK (Epic A) creates new store
obligations (privacy manifest, tracking consent, ad-id declaration, data-safety
disclosure), and a dating/live-chat UGC app faces extra content-safety scrutiny.
Sources at the bottom.

**Native project locations:**
- iOS: `apps/web/ios/App/App/Info.plist`, `apps/web/ios/App/App.xcworkspace`.
- Android: `apps/web/android/app/build.gradle`,
  `apps/web/android/variables.gradle` (`targetSdkVersion = 36`),
  `apps/web/android/app/src/main/AndroidManifest.xml`.

---

## B1 — iOS privacy manifest (`PrivacyInfo.xcprivacy`) — ✅ DONE (code)

- **Branch:** `feat/ios-privacy-manifest`
- **Priority:** P0 (Apple rejects builds without it once required-reason APIs /
  ad SDKs are present)
- **Depends on:** A0 (need to know the SDK's data behavior)

**Decision (locked):** Suzi Chat serves **non-personalized** ExoClick ads and does
**not** use IDFA / cross-app tracking → `NSPrivacyTracking=false`, no tracking
domains. This makes **B2 (ATT) a no-op** (no prompt required). Revisit only if the
ad strategy changes to personalized/IDFA ads.

**What was done:** created `apps/web/ios/App/App/PrivacyInfo.xcprivacy` declaring:
- `NSPrivacyTracking = false`, empty `NSPrivacyTrackingDomains`.
- Required-reason API `NSPrivacyAccessedAPICategoryUserDefaults` (Capacitor core)
  with reason `CA92.1`.
- Empty `NSPrivacyCollectedDataTypes` — app-level data collection is declared in
  App Store Connect **App Privacy** (Ticket B4) to keep one source of truth.
  (Only Capacitor core + apple-sign-in are bundled; no native Filesystem/
  Preferences/ad SDK, so no extra required-reason APIs are needed.)

**Manual step (Mac, one-time — NOT doable from Windows):** in Xcode, add the file
to the **App target** so it ships in the bundle:
`App` group → right-click → *Add Files to "App"…* → select `PrivacyInfo.xcprivacy`
→ ensure the **App** target is checked. (The file on disk alone isn't bundled
until it's a target member.)

**Acceptance criteria:** archive validates in Xcode with no missing-manifest or
required-reason warnings. If upload validation names an additional required-reason
API (from a CocoaPod), add it to the manifest with the reason code Apple gives.

---

## B2 — iOS App Tracking Transparency (ATT) — ⏭️ SKIPPED (non-tracking chosen)

- **Branch:** `feat/ios-att-tracking`
- **Depends on:** A0, B1

**Status:** Not needed under the B1 decision (non-personalized ads, no IDFA/
tracking). No `NSUserTrackingUsageDescription` and no ATT prompt required. Keep
this ticket parked; only implement the steps below if the client later switches
to personalized/IDFA ads.

**Goal (only if tracking is enabled later):** if ExoClick uses the advertising
identifier (IDFA) / cross-app tracking, show Apple's ATT prompt before tracking
and add the usage string.

**Steps:**
1. Add `NSUserTrackingUsageDescription` to `Info.plist` (currently absent) with a
   clear reason.
2. Add an ATT plugin (e.g. `@capacitor-community/app-tracking-transparency`);
   request authorization on first ad-eligible launch, **before** ExoClick loads
   tracking-based ads.
3. If the user denies, ensure ExoClick is configured to serve **non-personalized**
   ads.

**Acceptance criteria:** ATT prompt appears once on iOS; denying still shows
(non-personalized) ads; no IDFA access before consent.

**Note:** if you configure ExoClick to **not** use IDFA/tracking at all, you can
set `NSPrivacyTracking=false` (B1) and skip the ATT prompt — simpler and lower
risk. Decide with the client.

---

## B3 — Android `AD_ID` permission + SDK/target checks

- **Branch:** `feat/android-ad-id-permission`
- **Depends on:** A0

**Goal:** declare the advertising-id permission Play requires when an ads SDK reads
the Advertising ID, and confirm target-SDK/edge-to-edge.

**Steps:**
1. Add to `AndroidManifest.xml`:
   `<uses-permission android:name="com.google.android.gms.permission.AD_ID"/>`
   (only if ExoClick reads the Advertising ID; otherwise declare its absence in
   Data Safety).
2. Confirm `variables.gradle` `targetSdkVersion` ≥ 35 (currently 36 ✓).
3. Verify Android 15 **edge-to-edge** doesn't hide banners behind system bars;
   apply window-insets padding to the top/bottom banner containers.
4. Consider `minifyEnabled` / R8 for release (currently `false`).

**Acceptance criteria:** Play pre-launch report shows no policy warning about
Advertising ID; banners respect system bars.

---

## B4 — Privacy policy + App Privacy + Data Safety (ad disclosures)

- **Branch:** `feat/privacy-ads-disclosure`
- **Depends on:** A0

**Goal:** disclose ExoClick everywhere the stores check, and keep the three
sources consistent (policy text ↔ App Privacy ↔ Data Safety ↔ B1 manifest).

**Files to touch:**
- `apps/web/src/components/app/app-shell.tsx` `legalDocs` (lines ~48-132) — expand
  the advertising section to name ExoClick, the data collected/shared, tracking,
  and opt-out.
- `apps/web/src/app/privacy/page.tsx` — same disclosure in the public policy.
- Add `docs/store-listings/app-privacy.md` and
  `docs/store-listings/data-safety.md` capturing the exact answers to enter in
  App Store Connect and Play Console.

**Acceptance criteria:** policy names ExoClick and the data flows; App Privacy and
Data Safety answers match the B1 manifest and the SDK's real behavior.

**Store notes:** mismatches between declared data and actual SDK behavior are an
**automatic rejection** on both stores.

---

## B5 — UGC safety controls audit (Apple Guideline 1.2)

- **Branch:** `feat/ugc-safety-controls`
- **Priority:** P0 for a dating/live-chat app
- **Depends on:** none

**Goal:** ensure all four Apple-required UGC controls exist and work: (1) filter
objectionable content, (2) report mechanism, (3) block abusive users, (4)
published developer contact + EULA with zero-tolerance terms.

**Steps (audit, then fill gaps):**
1. **Block** — schema already has `UserBlock`; confirm block UI exists on
   profiles/DMs and enforced server-side.
2. **Report** — verify a "Report" action exists on user content (reels, snaps,
   dating profiles, room messages, DMs). If missing, add a report endpoint +
   button. This is the most common gap.
3. **Filter** — confirm a moderation path for uploaded media / messages (manual
   admin review at minimum; `(admin)` area exists).
4. **EULA + contact** — terms already state adults-only + zero tolerance
   (`terms/page.tsx`, `child-safety/page.tsx`); ensure published contact info and
   an in-app EULA acceptance (privacy/terms checkboxes at signup already exist).

**Acceptance criteria:** from any piece of user content you can **report** it and
**block** the author; admin can act on reports; contact info is published.

---

## B6 — Age rating + age-gate verification

- **Branch:** `feat/age-rating-verification` (mostly console config + minor code)
- **Depends on:** none

**Goal:** complete the new age-rating questionnaires and confirm the age gate.

**Steps:**
1. **Apple** — complete the updated age-rating questionnaire; set the app to the
   appropriate mature tier (Apple's 2026 tiers include 13+/16+/18+). Declare
   unrestricted web access / user-generated content / dating honestly.
2. **Google** — complete the IARC content-rating questionnaire; declare
   dating/mature/ads.
3. **Code** — confirm the signup 18+ gate (already required) and consider a
   date-of-birth age check where appropriate (Birthday is now optional per the
   earlier compliance work, so rely on the required 18+ confirmation).

**Acceptance criteria:** both listings carry a mature/18+ rating consistent with
the content; age gate blocks under-18 signups.

---

## B7 — Verified demo account + verification email

- **Branch:** n/a (ops) — see
  [`../APPLE_APP_STORE_COMPLIANCE.md`](../APPLE_APP_STORE_COMPLIANCE.md) §3–§4.

**Goal:** reviewers can log in with full access.

**Steps:** confirm production SMTP is configured (verification emails send);
create a **verified** demo account; test login on a device; enter creds in App
Store Connect **and** Play Console review notes. If ads gate any content, ensure
the demo path shows the full experience.

**Acceptance criteria:** fresh reviewer login works end-to-end on a real device.

---

## B8 — Rebuild, QA, screenshots, submit

- **Branch:** n/a (release)
- **Depends on:** ALL of A1–A7 and B1–B6

**Steps:**
1. `git checkout main && git pull && pnpm install`
2. `pnpm --filter web cap:sync` → `cd apps/web/ios/App && pod install`
3. Open Xcode (`pnpm --filter web cap:ios`): signing + Sign in with Apple
   capability → Archive → upload.
4. Android Studio (`pnpm --filter web cap:android`): bump `versionCode`/
   `versionName` in `apps/web/android/app/build.gradle` → signed AAB → upload.
5. Device QA: reels/snaps/dating playback + ad insertions + banners; ATT prompt;
   delete-account; report/block; demo login.
6. Update **screenshots** (show Sign in with Apple + the current UI, not broken
   media).
7. Submit both; answer App Privacy / Data Safety per B4.

**Acceptance criteria:** both apps submitted with all compliance items green.

---

## Compliance gaps checklist (from repo analysis)

- [ ] `apps/web/ios/App/App/PrivacyInfo.xcprivacy` created (B1) — **currently
      missing**.
- [ ] `NSUserTrackingUsageDescription` in `Info.plist` (B2) — **currently
      missing** (only camera/mic/photos present).
- [ ] `AD_ID` permission in `AndroidManifest.xml` (B3) — **currently missing**.
- [ ] Privacy policy names ExoClick + data sharing (B4).
- [ ] Report action on all UGC surfaces (B5) — verify/likely gap.
- [ ] Age-rating questionnaires completed (B6).
- [ ] Verified demo account + SMTP (B7).
- [ ] Screenshots refreshed, versions bumped, submitted (B8).

---

## Sources (store requirements, researched 2026-07)

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple — updated guidelines / objectionable content (Feb 2026)](https://www.mactech.com/2026/02/06/apple-updates-its-app-review-guidelines-with-expanded-list-of-apps-with-objectionable-content/)
- [Avoiding App Store rejection for dating apps (2026)](https://www.ongraph.com/avoiding-app-store-rejection-for-dating-apps/)
- [Apple App Store rejection reasons 2026](https://qawerk.com/blog/app-store-rejection-reasons/)
- [Google Play target API level policy](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)
- [Google Play account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)
- [Google Play Data Safety form guide (2026)](https://applander.io/blog/google-play-data-safety-form-complete-guide)
- [Google Play — inappropriate content policy](https://support.google.com/googleplay/android-developer/answer/9878810?hl=en)
- [Google — app ad requirements](https://support.google.com/adspolicy/answer/6258274?hl=en)
- [Capacitor iOS Privacy Manifest docs](https://capacitorjs.com/docs/v5/ios/privacy-manifest)
- [ExoClick guidelines](https://www.exoclick.com/guidelines/)
