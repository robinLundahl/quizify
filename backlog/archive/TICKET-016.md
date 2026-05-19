# TICKET-016: Preserve current page on reload

**Status:** Done
**Created:** 2026-05-19
**Priority:** Medium

## Description
Reloading the page always redirects the user to `/dashboard`, regardless of which page they were on. For example, reloading while on `/settings` lands you on `/dashboard` instead. The app should keep the user on the same route after a reload.

## Acceptance Criteria
- [x] Reloading on any authenticated route (e.g. `/settings`, `/quiz/:id`) keeps the user on that route
- [x] Unauthenticated users who reload a protected route are still redirected to login (no regression)
- [x] Deep-linking to a protected route works correctly after login

## Notes
- Root cause was a one-render race condition in `useAuth`: `user` came from Zustand and `isLoading` from React Query. When the query settled, `isLoading` flipped to false before the Zustand store updated, so `ProtectedRoute` briefly saw `user=null, isLoading=false` and redirected to `/login`, which then redirected to `/dashboard`.
- Fixed by returning `data ?? null` directly from React Query as `user` in `useAuth`, so both values are always in sync from the same source (`client/src/hooks/useAuth.ts`).
