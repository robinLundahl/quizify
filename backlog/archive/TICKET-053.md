# TICKET-053 — Email Verification on Signup

**Status:** Done  
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

## Acceptance criteria

- [x] Submitting the register form sends a 6-digit code to the provided email
- [x] Entering the correct code logs the user in and redirects to `/dashboard`
- [x] Entering a wrong code shows an error and allows retry
- [x] Code expires after 15 minutes — expired code shows an error
- [x] "Resend code" is disabled for 30 s then enabled; clicking it sends a fresh code
- [x] Trying to log in with an unverified account returns a prompt to verify
- [x] Google OAuth users are unaffected (bypass verification entirely)
- [x] Unsigned or tampered verification requests are rejected

## Notes

Implemented with Resend (`resend` npm package). Dev mode routes all emails to `DEV_EMAIL` env var since the `onboarding@resend.dev` sandbox only delivers to the Resend account owner. A shared `VerifyEmailStep` component handles the code UI in both Register and Login pages. Committed in `362b92e`.
