# TICKET-010: Add email/password login and registration

**Status:** Done  
**Created:** 2026-05-19  
**Priority:** Medium  

## Description
Allow users to sign up and log in with an email address and password, alongside the existing Google OAuth flow.

## Acceptance Criteria
- [x] `User` model has an optional `passwordHash` field; migration applied
- [x] `POST /api/auth/register` accepts `{ name, email, password }`, hashes the password with bcrypt, creates a User with `provider: "email"`, sets the JWT cookie
- [x] `POST /api/auth/login` accepts `{ email, password }`, verifies the bcrypt hash, sets the JWT cookie
- [x] Registering with an email that already exists via Google returns a clear error
- [x] Logging in with an OAuth-only account (no `passwordHash`) returns a clear error
- [x] Email format and minimum password length (8 chars) are validated server-side
- [x] `/login` page has an email + password form below the "Continue with Google" button, separated by an "or" divider
- [x] `/register` page exists with name, email, password, and confirm-password fields
- [x] Both forms show inline field-level and server error messages
- [x] On success, both flows redirect to `/dashboard`

## Notes
- `bcrypt` + `@types/bcrypt` must be added to `server/`
- Email verification and forgot-password are out of scope — separate tickets
- Changing an existing OAuth account to also have a password is out of scope

## Done
Shipped in commit df24e2a. Added bcrypt hashing, Prisma migration, two new API routes, updated Login page, and new Register page.
