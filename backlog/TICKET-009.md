# TICKET-009: Player session reconnection

**Status:** Open  
**Created:** 2026-05-18  
**Priority:** Medium  

## Description
If a player accidentally reloads the page or closes the tab during an active game session, they are currently locked out. The server rejects rejoin attempts with "Game has already started" and all client state is lost. Their Participant record and submitted answers are persisted in the database, but there is no way back into the game.

## Acceptance Criteria
- [ ] After joining, the client persists `sessionId` and `participantId` to `localStorage`
- [ ] On page load, the client checks `localStorage` for a saved session and attempts to reconnect if the session is still ACTIVE
- [ ] The server handles a `player:reconnect` socket event — validates the IDs, re-joins the socket room, and re-emits the current question with remaining time and the player's current score
- [ ] A reconnecting player cannot answer a question they already answered in that round
- [ ] `localStorage` is cleared when the session finishes or the player leaves voluntarily

## Notes
- Server in-memory `sessions` Map (`gameHandlers.ts`) holds current question index, timer, and `answeredParticipants` — reconnect handler needs to check this set before allowing an answer
- The `endsAt` timestamp is already included in `session:question` payloads, so the client can compute remaining time correctly on reconnect
- Edge case: server restarts wipe the in-memory sessions Map — reconnect should fail gracefully and show the join form
