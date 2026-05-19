# TICKET-016: Preserve current page on reload

**Status:** Open
**Created:** 2026-05-19
**Priority:** Medium

## Description
Reloading the page always redirects the user to `/dashboard`, regardless of which page they were on. For example, reloading while on `/settings` lands you on `/dashboard` instead. The app should keep the user on the same route after a reload.

## Acceptance Criteria
- [ ] Reloading on any authenticated route (e.g. `/settings`, `/quiz/:id`) keeps the user on that route
- [ ] Unauthenticated users who reload a protected route are still redirected to login (no regression)
- [ ] Deep-linking to a protected route works correctly after login

## Notes
- Root cause is likely in the auth rehydration flow: `useAuth` calls `GET /api/auth/me` on mount, but `ProtectedRoute` (or the router) redirects to `/dashboard` before the response comes back
- Fix should target the auth loading state in `ProtectedRoute` — show a spinner or nothing while the session is being verified, then render the requested route once confirmed
