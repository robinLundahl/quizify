# TICKET-027: Host session reconnection

**Status:** Done  
**Created:** 2026-05-19  
**Priority:** Medium  

## Description
If the host accidentally refreshes, reloads, or closes the browser tab during an active game session, they currently lose all control of the session. The session remains ACTIVE in the database and the in-memory state is preserved on the server (as long as the server hasn't restarted), but there is no way for the host to re-enter and continue driving the game forward.

## Acceptance Criteria
- [x] After starting a session, the client persists `sessionId` to `localStorage`
- [x] On page load / navigation to the host view, the client checks `localStorage` for a saved session and if the session is still ACTIVE, reconnects automatically
- [x] The server handles a `host:rejoin` socket event — validates the sessionId, re-joins the socket room, and re-emits the current question state (question data, `endsAt`, current index, total count) so the host screen is restored
- [x] The host can continue to call `host:next` and `host:end` after rejoining
- [x] `localStorage` is cleared when the session finishes (status: FINISHED)
- [x] If the server has restarted (in-memory sessions Map wiped), rejoin fails gracefully and the host is shown an error with the option to go back to the dashboard

## Notes
- In-memory `sessions` Map in `gameHandlers.ts` holds the current question index, timer, and `answeredParticipants` — the rejoin handler needs to read from this map
- The `questionStartedAt` timestamp is stored in `SessionState`, so remaining time can be computed as `questionStartedAt + timeLimit * 1000 - Date.now()`
- Players do not need to do anything on host rejoin — they are already in the socket room
- Related: TICKET-009 covers the equivalent flow for players

## Implementation
Shipped in commit e6adf07. Added `host:rejoin` socket handler on the server that checks DB status and in-memory state, then re-emits `host:rejoin_success` with phase (`question` or `reveal`) and all required state. Client saves sessionId to localStorage on `session:started`, attempts rejoin on mount if saved sessionId matches URL, and shows a graceful error screen on failure. Also extracted `computeCorrectAnswer` and `buildQuestionPayload` helpers on the server to avoid duplication.
