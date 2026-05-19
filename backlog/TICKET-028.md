# TICKET-028: Active session banner on dashboard

**Status:** Open  
**Created:** 2026-05-19  
**Priority:** Medium  

## Description
After starting a game, the host has no way to get back into an ACTIVE session from the dashboard — they can only reach it via browser history or if the tab is still open. This ticket adds a prominent "Active session" banner at the top of the dashboard for each session currently in ACTIVE or WAITING status, with a "Rejoin" button that takes the host back into the host view.

## Acceptance Criteria
- [ ] A new `GET /api/sessions/active` endpoint returns all sessions owned by the authenticated host with `status: ACTIVE` or `status: WAITING`, including `id`, `code`, `status`, and `quizTitle`
- [ ] The dashboard fetches active sessions and renders a banner above the quiz grid when at least one is found
- [ ] Each banner entry shows the quiz title, session code, status badge (Waiting / In progress), and a "Rejoin" button
- [ ] Clicking "Rejoin" sets the `quizify_active_host_session` localStorage key to the `sessionId`, then navigates to `/host/:sessionId` with `location.state = { code, rejoin: true }`
- [ ] HostView checks `location.state?.rejoin` in addition to the existing localStorage check; if either is true, emits `host:rejoin` instead of `host:join`
- [ ] Active sessions are excluded from the "Past sessions" list within each quiz card (currently they would not appear there anyway since the quiz route filters to `FINISHED` only, but this should be kept explicit)
- [ ] The active sessions banner polls or refetches on window focus so it stays fresh if the host switches tabs

## Notes
- `GET /api/quiz` already filters sessions to `status: FINISHED` — the active sessions panel needs a separate query
- Setting localStorage before navigating means the existing TICKET-027 reconnection flow handles the socket `host:rejoin` emit; checking `location.state?.rejoin` is an additional safety net for cases where localStorage was cleared (different device, private browsing, etc.)
- WAITING sessions (lobby phase) are included in the banner because the host may also want to return to a lobby they accidentally closed; HostView's `host:join` handler already handles WAITING — only emit `host:rejoin` for `status: ACTIVE`
- Consider automatically removing the banner entry for a session after it finishes (refetch on focus covers this)
- Related: TICKET-027 (host socket reconnection — the socket layer that this ticket's navigation triggers)
- Related: TICKET-009 (equivalent player reconnection flow)
