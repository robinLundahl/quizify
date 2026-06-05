# TICKET-089 — Fix host lobby not updating when players join

**Status:** Open  
**Type:** Bug  
**Priority:** High

## Problem

Intermittently, when a player joins a session, the host does not see the new participant appear in the waiting lobby in real time. The player successfully connects and joins the session on the backend, but the host's lobby UI does not update until the page is manually refreshed. This indicates that the backend successfully processes the join but the host client either does not receive the Socket.io broadcast event or fails to process it correctly.

This issue occurs intermittently rather than consistently, suggesting a race condition between event subscriptions, session initialization, or component mounting, or potential issues with Socket.io event delivery, duplicate connections, or stale React state preventing UI updates.

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

- [ ] Identify the root cause of why the host does not receive or process player-joined events intermittently
- [ ] Fix the Socket.io event subscription or React state issue preventing real-time lobby updates
- [ ] Verify that when a player joins, the host sees them appear instantly in the lobby 100% of the time
- [ ] Ensure no race conditions exist between session initialization and event subscriptions
- [ ] Test with multiple players joining rapidly to confirm updates are reliable under load
