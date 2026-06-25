# Apple App Store Compliance — Resubmission Guide

This document tracks the fixes for the App Review rejection (Submission ID
`d0a104f0-80ca-43e1-ab3b-f0426012bc8f`, review date June 22, 2026) and the
manual steps required before resubmitting.

Apple raised four blocking issues plus one follow-up (screenshots). Each is
listed below with **what was changed in code** and **what you must do manually**.

---

## 1. Guideline 5.1.1(v) — Birthday & Gender must not be required

Apple does not allow requiring personal data that isn't essential to the core
app. Birthday and Gender are now **optional** everywhere.

**Code changes (done):**
- `apps/web/src/app/(auth)/register/page.tsx` — birthday/gender no longer fail
  validation when blank; labels show "(optional)"; blank values are omitted from
  the request. Age is still gated by the required **"I confirm that I am 18+"**
  checkbox.
- `apps/api/src/auth/dto/register.dto.ts` — `birthday` and `gender` are
  `@IsOptional()`.
- `apps/api/src/auth/auth.service.ts` — `register()` accepts a null birthday and
  defaults gender to `PREFER_NOT_TO_SAY`; validation only runs when a value is
  supplied. The Prisma `User.birthday` column was already nullable.

**Manual steps:** none.

---

## 2. Guideline 4.8 — Sign in with Apple required

Because the app offers Google sign-in, it must also offer an equivalent
privacy-preserving login. Sign in with Apple has been added.

**Code changes (done):**
- Backend: new `appleId` column on `User`; `POST /v1/auth/apple` endpoint
  (`auth.controller.ts`); `appleAuth()` in `auth.service.ts` verifies the Apple
  identity token against Apple's JWKS using `jose`, then signs in / links by
  email / creates an account (mirroring the Google flow). New
  `apps/api/src/auth/dto/apple-auth.dto.ts`. New `APPLE_CLIENT_IDS` config.
- Frontend: `apps/web/src/components/auth/apple-auth-button.tsx` — native Apple
  sheet on iOS via `@capacitor-community/apple-sign-in`, AppleID JS SDK fallback
  on web. Wired into the register page and the login panel next to Google.
  `loginWithApple()` added to `apps/web/src/lib/auth-client.ts`.

**Manual steps (REQUIRED — only the account holder can do these):**

1. **Apple Developer portal → Certificates, Identifiers & Profiles → Identifiers**
   - Open the App ID `com.suzichat.app` and enable the **Sign in with Apple**
     capability. Save.
2. **Xcode** (`apps/web/ios/App/App.xcworkspace`)
   - Select the **App** target → **Signing & Capabilities** → **+ Capability** →
     **Sign in with Apple**. This adds the entitlement to the app.
3. **(Web login only — skip if iOS-only)** Create a **Services ID** (e.g.
   `com.suzichat.web`), configure your domain and the Return URL
   (`https://suzichat.com/login`), and create a **Sign in with Apple key**.
4. **API environment:** set `APPLE_CLIENT_IDS` to the bundle id, plus the web
   Service ID if used — e.g. `com.suzichat.app,com.suzichat.web`.
5. **Web environment (only if web login is used):** set
   `NEXT_PUBLIC_APPLE_SERVICE_ID` and `NEXT_PUBLIC_APPLE_REDIRECT_URI`.
6. **Sync native project:** `pnpm --filter web cap:sync`, then in
   `apps/web/ios/App` run `pod install`, and rebuild in Xcode.

> The audience (`aud`) in the native iOS token is the **bundle id**; the web
> token's audience is the **Service ID**. `APPLE_CLIENT_IDS` must contain
> whichever ones you actually use, or token verification will reject.

---

## 3. Guideline 2.1 — Working demo account required

The previous demo account could not log in — almost certainly because its email
was never verified (see issue 4: no verification email was being sent, and
login is blocked until `isEmailVerified` is true).

**After fixing SMTP (issue 4 below)**, create a fresh demo account:

**Option A — register normally, then verify** (preferred once SMTP works):
1. Register `appledemo@suzichat.com` in the app.
2. Open the verification email and click the link.

**Option B — mark an account verified directly** (if you prefer not to rely on
email for the reviewer account). Run against the production DB:

```sql
UPDATE "User" SET "isEmailVerified" = true WHERE email = 'appledemo@suzichat.com';
```

or via Prisma Studio (`pnpm --filter api studio`) — toggle `isEmailVerified` to
`true` on that user.

Then in **App Store Connect → App Review Information**, set the demo account
username/password and **test the login yourself on a device** before submitting.
Make sure the account has full access to all features.

---

## 4. Guideline 2.1(a) — No verification email received

The email code (`auth-email.service.ts`, nodemailer/SMTP) is correct. The bug is
that **SMTP was not configured in the production environment**, so
`isConfigured` was false and no email was ever sent — and in production the
fallback preview token is intentionally not exposed.

**Code changes (done):**
- `auth-email.service.ts` now logs a loud **error at startup** in production when
  SMTP is missing (instead of failing silently on first signup), and caches a
  single transporter.

**Manual steps (REQUIRED):**
- Set real SMTP credentials in the **production API** environment:
  `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`.
  Use a transactional provider (SendGrid, Mailgun, Amazon SES, Postmark, etc.).
- Ensure the **From** domain is verified (SPF/DKIM) so mail doesn't land in spam
  — Apple's reviewer flagged not receiving it at all.
- Confirm `APP_BASE_URL` points to the real domain (verification links use it).
- After deploying, register a test account and confirm the email arrives.

---

## 5. Update App Store screenshots (follow-up)

Once Sign in with Apple is live, capture new screenshots of the **login and
register screens showing the Apple button**, and any other screens that changed,
then replace the screenshots in App Store Connect. Apple specifically asked for
this after the login change. (This is done in App Store Connect, not in code.)

---

## Database migration note

This project uses `prisma db push` (no migration files). After pulling these
changes, apply the new `appleId` column:

```bash
pnpm --filter api prisma:generate
pnpm db:push        # applies appleId to the database
```

---

## Pre-resubmission checklist

- [ ] Birthday & Gender optional — verified on a fresh signup (code: done)
- [ ] `appleId` column pushed to the production DB
- [ ] Sign in with Apple capability enabled (portal + Xcode entitlement)
- [ ] `APPLE_CLIENT_IDS` set on the API
- [ ] `pnpm --filter web cap:sync` + `pod install` run; iOS build includes Apple button
- [ ] Sign in with Apple tested end-to-end on a real device
- [ ] SMTP configured in production; verification email confirmed arriving
- [ ] Fresh, verified demo account created and **login tested**; credentials in App Store Connect
- [ ] New screenshots (with Apple button) uploaded
- [ ] Resubmit for review
