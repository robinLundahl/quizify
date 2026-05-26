# TICKET-060 — Implement guest/logged-out state

**Status:** Done  
**Type:** Feature  
**Priority:** High

## Goal

Make the application publicly accessible without requiring login. Currently there is no logged-out state — all routes redirect to login or the dashboard. The marketplace must be browsable by anyone, so a guest state is required before any public marketplace pages can be built.

## Acceptance criteria

- [x] Visiting `/` does not redirect unauthenticated users to login
- [x] Guest users can browse the marketplace, view quiz listings, and visit creator profiles
- [x] Protected routes (`/dashboard` and anything requiring auth) still redirect to login
- [x] Deferred auth: when a guest triggers a login-required action (e.g. purchase), they are redirected to login and then back to the original page after authenticating
- [x] Nav bar reflects logged-out state (login/signup buttons, no dashboard link)
