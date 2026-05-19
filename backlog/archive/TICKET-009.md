# TICKET-009: Player session reconnection

**Status:** Done  
**Created:** 2026-05-18  
**Priority:** Medium  

## Description
If a player accidentally reloads the page or closes the tab during an active game session, they are currently locked out. The server rejects rejoin attempts with "Game has already started" and all client state is lost. Their Participant record and submitted answers are persisted in the database, but there is no way back into the game.

## Acceptance Criteria
- [x] After joining, the client persists `sessionId` and `participantId` to `localStorage`
- [x] On page load, the client checks `localStorage` for a saved session and attempts to reconnect if the session is still ACTIVE
- [x] The server handles a `player:reconnect` socket event — validates the IDs, re-joins the socket room, and re-emits the current question with remaining time and the player's current score
- [x] A reconnecting player cannot answer a question they already answered in that round
- [x] `localStorage` is cleared when the session finishes or the player leaves voluntarily

## Notes
- Server in-memory `sessions` Map (`gameHandlers.ts`) holds current question index, timer, and `answeredParticipants` — reconnect handler needs to check this set before allowing an answer
- The `endsAt` timestamp is already included in `session:question` payloads, so the client can compute remaining time correctly on reconnect
- Edge case: server restarts wipe the in-memory sessions Map — reconnect should fail gracefully and show the join form

## Implementation
Shipped in commit 990a481. Server `player:reconnect` handler in `gameHandlers.ts` validates session (ACTIVE) and participant (belongs to session), checks in-memory Map (fails gracefully if server restarted), joins socket room, and re-emits current state based on phase: question (with endsAt), answered (player already submitted), or reveal (correct answer + leaderboard + pointsEarned from GameAnswer). Client saves keys to localStorage on `player:joined`, clears on `session:finished`. On the join screen a "Rejoin game" banner is shown when saved session data exists — player explicitly clicks to reconnect rather than auto-reconnecting on mount. `player:reconnect_failed` clears localStorage and hides the banner with an error message.
