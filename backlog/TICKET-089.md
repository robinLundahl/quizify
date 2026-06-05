# TICKET-089 — Fix host lobby not updating when players join

**Status:** Resolved  
**Type:** Bug  
**Priority:** High

## Problem

Intermittently, when a player joins a session, the host does not see the new participant appear in the waiting lobby in real time. The player successfully connects and joins the session on the backend, but the host's lobby UI does not update until the page is manually refreshed. This indicates that the backend successfully processes the join but the host client either does not receive the Socket.io broadcast event or fails to process it correctly.

This issue occurs intermittently rather than consistently, suggesting a race condition between event subscriptions, session initialization, or component mounting, or potential issues with Socket.io event delivery, duplicate connections, or stale React state preventing UI updates.

## Root Cause Analysis

**Two race conditions were identified:**

### Race Condition #1: Event listener registration timing

In `HostView.tsx`, the `useEffect` hook emitted `host:join` **before** registering the Socket.io event listeners:

```typescript
// OLD CODE:
socket.emit('host:join', { sessionId })  // Emit first
socket.on('host:joined', (data) => { ... })  // Register listener after
```

If the server responded very quickly (common in low-latency environments), the `host:joined` response could arrive before the listener was registered, causing it to be silently dropped.

### Race Condition #2: Player list overwrite

When `host:joined` was received, the handler completely **replaced** the player list:

```typescript
// OLD CODE:
socket.on('host:joined', ({ participants }) => {
  setPlayers(participants.map(...))  // Overwrites entire list
})
```

If a `session:player_joined` broadcast arrived before `host:joined` (e.g., a player joined during the brief window while the host was connecting), the player would be added to the state, then immediately removed when `host:joined` overwrote the list with the stale participant snapshot.

**Timeline of the bug:**
1. Host component mounts, emits `host:join`
2. Player joins, server broadcasts `session:player_joined`
3. Host receives `session:player_joined`, adds player to list
4. Server responds to host with `host:joined` containing old participant list
5. Host receives `host:joined`, **overwrites** list, removing the new player
6. Host sees empty lobby until page refresh

## Resolution

**Fix #1:** Register all Socket.io event listeners **before** emitting `host:join` to ensure no responses are missed.

**Fix #2:** Changed `host:joined` handler from overwrite to **merge**:
```typescript
socket.on('host:joined', ({ participants }) => {
  setPlayers((prev) => {
    const existingNicknames = new Set(prev.map((p) => p.nickname))
    const newPlayers = participants
      .filter((nickname) => !existingNicknames.has(nickname))
      .map((nickname) => ({ id: nickname, nickname, score: 0 }))
    return [...prev, ...newPlayers]
  })
})
```

This ensures players who joined before the initial snapshot are preserved.

## Investigation tasks

1. Trace the complete player-join flow from `player:join` emit to host receiving `player:joined` or equivalent broadcast event
2. Verify backend successfully broadcasts player-joined events to the host's socket room/session
3. Review Socket.io event subscriptions in HostView to ensure listeners are registered before players can join
4. Investigate race conditions between session creation, socket room joining, and event subscription timing
5. Check for duplicate socket connections, missed event handlers, or event listeners being cleaned up prematurely
6. Review React state management in HostView for stale closures, missing dependencies, or memoization blocking re-renders
7. Inspect browser console and server logs during a failed update to identify dropped events or subscription issues
8. Determine specific conditions that trigger the intermittent failure (timing, connection state, component lifecycle)

## Acceptance criteria

- [x] Identify the root cause of why the host does not receive or process player-joined events intermittently
- [x] Fix the Socket.io event subscription or React state issue preventing real-time lobby updates
- [ ] Verify that when a player joins, the host sees them appear instantly in the lobby 100% of the time
- [x] Ensure no race conditions exist between session initialization and event subscriptions
- [ ] Test with multiple players joining rapidly to confirm updates are reliable under load
