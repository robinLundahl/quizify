# TICKET-052 — Fix Socket.io Authentication & Game Integrity Vulnerabilities

**Status:** Done  
**Type:** Security  
**Priority:** High

## Problem

The Socket.io layer has no authentication at the connection level and no ownership checks on game events. This means:

- Anyone can open a WebSocket connection without a valid JWT
- Any connected client can take over any active game session by emitting host events
- Any connected client can submit answers on behalf of other players, inflating or sabotaging scores

The HTTP API is **not** affected — `plan` and `isAdmin` cannot be changed via HTTP by regular users. The vulnerabilities are isolated to the real-time game layer.

---

## Vulnerabilities

### HIGH — No auth at Socket.io connection level
**File:** `server/src/socket/index.ts`

`io.on('connection', ...)` has no middleware verifying the JWT cookie. Any client can connect and reach all event handlers unauthenticated.

### HIGH — Host events have no ownership check
**File:** `server/src/socket/gameHandlers.ts`

`host:join`, `host:set_theme`, `host:rejoin`, `host:next`, `host:stop_question` accept a `sessionId` from the client but never verify that the socket belongs to the session's `hostId`. Any connected client can control any active game.

### HIGH — `player:answer` accepts `participantId` from the client
**File:** `server/src/socket/gameHandlers.ts`

An attacker can submit answers for any participant, changing their score.

### MEDIUM — `player:reconnect` has no participant ownership check
Same pattern as above — `participantId` comes from the client with no socket-to-participant binding.

---

## Implementation

### Fix 1 — JWT auth middleware on Socket.io connection
Add `io.use()` middleware in `server/src/socket/index.ts` that:
1. Reads the `token` cookie from `socket.handshake.headers.cookie`
2. Verifies it with `JWT_SECRET` (same logic as `requireAuth`)
3. Stores `socket.data.userId` on success
4. Allows guest connections through with `socket.data.userId = null`

### Fix 2 — Verify host ownership in host:* handlers
All `host:*` handlers now check `session.hostId === socket.data.userId`.
A `sessionHosts` map tracks the host during the lobby phase; ownership moves into `SessionState.hostId` when the game starts.

### Fix 3 — Bind participantId to socket.data on player:join
`player:answer` now uses `socket.data.participantId` bound at join time. Client-supplied `participantId` field removed from the payload type.

---

## Files modified

| File | Change |
|---|---|
| `server/src/socket/index.ts` | Added `io.use()` JWT auth middleware + SocketData type |
| `server/src/socket/gameHandlers.ts` | Host ownership checks; participantId bound to socket.data |

---

## Acceptance criteria

- [x] Connecting to Socket.io without a valid JWT cookie is allowed but marks socket as guest (`userId = null`)
- [x] Emitting any `host:*` event as a non-owner returns an error event and has no effect
- [x] Emitting `player:answer` with another player's `participantId` has no effect — only the socket's own participant score updates
- [x] Existing game flow (join → answer → results) still works end-to-end

## Done

Fixed in commit `9d07300`. All three HIGH vulnerabilities resolved.
