# TICKET-053 — Email Verification on Signup

**Status:** Open  
**Type:** Feature  
**Priority:** Medium

## Problem

Users who sign up with email and password are immediately logged in with no proof they own the email address. This allows fake accounts, typo'd emails that can never recover a password, and reduces trust.

Google OAuth users are already verified by Google — this only applies to the `provider: 'email'` flow.

---

## Goal

After submitting the registration form, the user receives a 6-digit code by email. They must enter the code before they are logged in. Unverified accounts cannot log in.

---

## User flow

1. User fills in name, email, password → submits register form
2. Server creates an unverified user + generates a 6-digit code (expires in 15 min) → sends it by email
3. Client transitions to a **code entry step** (same page, no redirect)
4. User types the 6-digit code → submits
5. Server verifies the code → marks user as verified → sets JWT cookie → redirects to `/dashboard`
6. If the code is wrong or expired → show error, allow retry or resend
7. "Resend code" button available after 30 seconds

---

## Email service

No email library is currently installed. Use **Resend** (`resend` npm package) — simple REST-based API, good TypeScript support, generous free tier.

### Dashboard setup (resend.com)
1. Create a free account at resend.com
2. Add and verify a sending domain (or use the sandbox address for development)
3. Create an API key → add to `server/.env` as `RESEND_API_KEY`
4. Set a `FROM_EMAIL` env var (e.g. `noreply@yourdomain.com`)

### Required env vars
```
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@yourdomain.com
```

---

## Implementation

### Schema (`server/prisma/schema.prisma`)

Add to `User` model:
```prisma
emailVerified Boolean @default(false)
```

Add new model:
```prisma
model EmailVerification {
  id        String   @id @default(cuid())
  userId    String   @unique
  code      String
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

Add back-relation to `User`:
```prisma
emailVerification EmailVerification?
```

Run `npm run db:migrate` then `npm run db:generate`.

### New: `server/src/lib/email.ts`

Resend singleton + `sendVerificationEmail(to, code)` helper:
```typescript
import { Resend } from 'resend'
const resend = new Resend(process.env['RESEND_API_KEY'])

export async function sendVerificationEmail(to: string, code: string) {
  await resend.emails.send({
    from: process.env['FROM_EMAIL']!,
    to,
    subject: 'Your Quizify verification code',
    html: `<p>Your verification code is: <strong>${code}</strong></p><p>It expires in 15 minutes.</p>`,
  })
}
```

### Modified: `server/src/routes/auth.ts`

**`POST /api/auth/register`**
- After creating the user, generate a random 6-digit code (`Math.floor(100000 + Math.random() * 900000).toString()`)
- Store in `EmailVerification` with `expiresAt = now + 15 min`
- Call `sendVerificationEmail(email, code)`
- Return `{ pending: true, userId: user.id }` — **do not set JWT cookie yet**

**New: `POST /api/auth/verify-email`**
- Body: `{ userId, code }`
- Find `EmailVerification` by `userId`
- Check code matches and `expiresAt > now` — return 400 on failure
- Set `emailVerified = true` on User, delete the `EmailVerification` row
- Sign JWT, set cookie, return user object (same shape as login response)

**New: `POST /api/auth/resend-verification`**
- Body: `{ userId }`
- Find user — must be `emailVerified: false` and `provider: 'email'`
- Delete old `EmailVerification`, generate new code, send email
- Return `{ ok: true }`

**`POST /api/auth/login`**
- After password check, add: if `!user.emailVerified` → return `403 { error: 'email_not_verified', userId: user.id }`
- Client uses this to redirect the user back to the code entry step

### Modified: `client/src/pages/Register.tsx`

After successful form submission (`pending: true`), show a second step in-page:
- Heading: "Check your email"
- Subtext: "We sent a 6-digit code to {{email}}"
- Six individual digit inputs (or a single `<input maxLength={6}>`)
- Submit button: "Verify"
- "Resend code" button (disabled for 30 s, then enabled)
- On success → navigate to `/dashboard`
- On error → show "Invalid or expired code"

### Modified: `client/src/pages/Login.tsx`

If the server returns `403` with `error: 'email_not_verified'`:
- Show a message: "Please verify your email first."
- Show a "Resend code" button that calls `POST /api/auth/resend-verification`
- After resend, transition to the same code entry UI as the register page

### i18n (`en.json` + `sv.json`) — add to `register` section

```json
"check_email_title": "Check your email",
"check_email_hint": "We sent a 6-digit code to {{email}}",
"enter_code": "Enter code",
"verify": "Verify",
"resend_code": "Resend code",
"resend_in": "Resend in {{s}}s",
"invalid_code": "Invalid or expired code. Please try again.",
"email_not_verified": "Please verify your email before signing in."
```

---

## Files to create

| File | Purpose |
|---|---|
| `server/src/lib/email.ts` | Resend singleton + sendVerificationEmail helper |

## Files to modify

| File | Change |
|---|---|
| `server/prisma/schema.prisma` | Add `emailVerified` to User + `EmailVerification` model |
| `server/src/routes/auth.ts` | Modify register + login; add verify-email + resend routes |
| `client/src/pages/Register.tsx` | Add code entry step after form submission |
| `client/src/pages/Login.tsx` | Handle `email_not_verified` 403 response |
| `client/src/locales/en.json` | Add i18n keys |
| `client/src/locales/sv.json` | Add i18n keys |

---

## Acceptance criteria

- [ ] Submitting the register form sends a 6-digit code to the provided email
- [ ] Entering the correct code logs the user in and redirects to `/dashboard`
- [ ] Entering a wrong code shows an error and allows retry
- [ ] Code expires after 15 minutes — expired code shows an error
- [ ] "Resend code" is disabled for 30 s then enabled; clicking it sends a fresh code
- [ ] Trying to log in with an unverified account returns a prompt to verify
- [ ] Google OAuth users are unaffected (bypass verification entirely)
- [ ] Unsigned or tampered verification requests are rejected

## Verification

1. Add `RESEND_API_KEY` and `FROM_EMAIL` to `server/.env`
2. Register with a real email → confirm code email arrives
3. Enter correct code → redirected to `/dashboard`, `emailVerified = true` in DB
4. Register again, wait 15 min (or manually expire in DB) → confirm expired code error
5. Try logging in before verifying → confirm prompt appears
6. Sign up with Google → confirm no code step appears
