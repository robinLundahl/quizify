# TICKET-091 — Sync player to current game state on app resume

**Status:** Open  
**Type:** Bug  
**Priority:** Medium

## Problem

Players can become stuck on the "Väntar på andra spelare" screen while the host and other players have already progressed to the next question. The trigger is suspected to be backgrounding the app (switching to another app, going to the home screen, or locking the device), though it is not yet confirmed as the only cause. When the app is backgrounded, the mobile browser may suspend JavaScript execution, throttle timers, or temporarily drop the WebSocket connection. If the host advances the game while the client is in this state, one or more real-time transition events are missed. Because navigation currently relies entirely on receiving these socket events, the client never re-synchronises when the app becomes active again — leaving the player permanently stuck on an outdated screen. The only current workaround is to manually refresh the page and press "Återgå till aktivt spel".

## Observed behavior

1. Player joins an active quiz session.
2. Player backgrounds the app (app switch, home screen, or device lock) during a question.
3. While backgrounded: the question timer expires and the host advances to the next question.
4. Player returns to the app and remains on "Väntar på andra spelare".
5. Host and all other players are already on the next question.
6. Player is unaware the game has progressed and cannot continue without a manual page refresh.

## Technical hypothesis

Mobile browsers aggressively throttle or suspend backgrounded tabs — pausing timers, queuing or dropping WebSocket frames, and delaying JavaScript execution. If a `session:question` or `session:question_ended` event is emitted by the server while the client is suspended, the event may be missed or arrive in a corrupted order. On resume, the client has no mechanism to detect the gap and re-request authoritative state from the server. Navigation is therefore entirely event-driven with no server-authoritative fallback.

## Investigation goals

- Verify whether backgrounding causes lost WebSocket connections, missed events, suspended timers, or failed reconnection handling.
- Determine whether the client re-fetches session state when the app becomes active again, on visibility change, or on WebSocket reconnect.
- Review all navigation transitions between Question View → Waiting View → Results View → Next Question View for event-only dependencies.
- Identify whether race conditions could explain why the issue is intermittent.

## Acceptance criteria

- [ ] When the player returns to a foregrounded app, the client detects the visibility change (`visibilitychange` / `focus`) and re-syncs with the server via `player:reconnect`, receiving the current phase and navigating immediately.
- [ ] If the socket disconnected while backgrounded, the `connect` handler fires on reconnect and triggers the same state re-sync.
- [ ] A player who misses one or more full question-and-reveal cycles still lands on the correct current view with no manual refresh.
- [ ] The fix is verified on mobile Chrome and Safari, where background throttling is most aggressive.
- [ ] No regression to the existing `player:reconnect` flow used after a full page reload.
- [ ] Manually refreshing and pressing "Återgå till aktivt spel" is never required to continue playing.
