# TICKET-091 — Sync player to current game state on app resume

**Status:** Open  
**Type:** Bug  
**Priority:** Medium

## Problem

When a player backgrounds the app (app switch, home screen, or device lock) during a live quiz session, the mobile browser may suspend the WebSocket connection or throttle JS execution, causing real-time events to be missed. If the question timer expires and the host advances to the next question while the player is away, the player returns to find themselves stuck on the "Väntar på andra spelare" screen rather than the current game view. Navigation relies entirely on receiving socket events in real time, so any event missed while backgrounded leaves the client permanently out of sync until the player manually refreshes and uses "Återgå till spelet".

## Acceptance criteria

- [ ] When the player returns to a foregrounded app, the client detects the visibility change and re-syncs with the server via `player:reconnect`, receiving the current phase (question, answered, or reveal) and navigating immediately.
- [ ] If the socket disconnected while the app was backgrounded, the reconnect handler fires automatically on socket `connect` and re-requests the current state.
- [ ] A player who misses one or more full question-and-reveal cycles still lands on the correct current view with no manual refresh.
- [ ] The fix is verified on mobile Chrome/Safari where background throttling is most aggressive.
- [ ] No regression to the existing `player:reconnect` flow used after a full page reload.
