# TICKET-052 — Fix Socket.io Authentication & Game Integrity Vulnerabilities

**Status:** Open  
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

```ts
socket.on('player:answer', async (data: { participantId: string, ... }) => {
  // No check that this socket owns this participantId
  await prisma.participant.update({ where: { id: participantId }, ... })
})
```

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
4. Calls `next(new Error('Unauthorized'))` on failure — this closes the connection

Guest players (not logged in) join with a display name only, so the middleware should allow unauthenticated connections but mark them as guests (`socket.data.userId = null`). Host events should then require a non-null `userId`.

### Fix 2 — Verify host ownership in host:* handlers
In `server/src/socket/gameHandlers.ts`, after loading the session from the DB in each `host:*` handler:

```ts
if (session.hostId !== socket.data.userId) {
  socket.emit('error', { message: 'Unauthorized' })
  return
}
```

Apply to: `host:join`, `host:set_theme`, `host:rejoin`, `host:next`, `host:stop_question`.

### Fix 3 — Bind participantId to socket.data on player:join
In the `player:join` handler, after creating or finding the participant:

```ts
socket.data.participantId = participant.id
```

In `player:answer` and `player:reconnect`, use `socket.data.participantId` instead of the client-supplied value and ignore the `participantId` field from the payload entirely.

---

## Files to modify

| File | Change |
|---|---|
| `server/src/socket/index.ts` | Add `io.use()` JWT auth middleware |
| `server/src/socket/gameHandlers.ts` | Add host ownership checks; bind participantId to socket.data on join |

---

## Acceptance criteria

- [ ] Connecting to Socket.io without a valid JWT cookie is allowed but marks socket as guest (`userId = null`)
- [ ] Emitting any `host:*` event as a non-owner returns an error event and has no effect
- [ ] Emitting `player:answer` with another player's `participantId` has no effect — only the socket's own participant score updates
- [ ] Existing game flow (join → answer → results) still works end-to-end

## Verification

1. Open a WebSocket connection from a browser console without a token cookie → should connect but be blocked from host events
2. Join a game as player A, capture the `participantId` of player B, emit `player:answer` with B's ID → B's score should not change
3. Emit `host:next` for a session you don't own → should receive an error event
4. Run a full game as normal host + players → no regressions
