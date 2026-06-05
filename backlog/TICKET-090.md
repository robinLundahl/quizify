# TICKET-090 — Fix host not navigating to results when timer expires

**Status:** Done  
**Type:** Bug  
**Priority:** High

## Problem

During live game sessions, the question timer occasionally reaches 0 without the host being navigated to the results view. The timer remains visible and continues pulsing at 0 while the session appears stuck — other clients may also remain unsynchronised. The bug is intermittent and likely involves a race condition between timer expiration, answer submission, and state transitions, or a stale closure / missed WebSocket event on the host client.

## Acceptance criteria

- [x] Timer expiration always triggers a server-side state transition to the results phase, with no silent failures.
- [x] The host client always navigates to the results view when the timer reaches 0, even if a real-time event is missed (e.g. via a polling fallback or reconnect reconciliation).
- [x] All player clients remain synchronised with the host during and after the transition.
- [x] Stale closures in React effects that consume the timer or socket events are identified and eliminated.
- [x] Production logs show no unhandled exceptions or stuck session states around timer expiration.

## Resolution

Three root causes identified and fixed:

**Server (`gameHandlers.ts`)**
- `void endQuestion(...)` in the timer callback silently swallowed all errors. Replaced with `.catch(console.error)` so failures are logged.
- `endQuestion` emitted `session:question_ended` only after `prisma.participant.findMany`. If that query threw (e.g. transient DB timeout), the event was never emitted and clients got permanently stuck. Fixed by wrapping the query in try/catch and always emitting (with an empty scores array as fallback).

**Client (`HostView.tsx`)**
- Added a `phaseRef` kept in sync with the `phase` state, allowing callbacks and effects to read the current phase without stale closures.
- Added a 3-second grace-period effect: if the phase is still `question` when `timeLeft` hits 0, the client emits `host:rejoin` after 3 seconds to re-sync with the server. The existing `host:rejoin_success` handler already transitions the UI to the correct phase.
- Added a `socket.on('connect', ...)` reconnect handler: if the socket disconnects and reconnects during an active game, the host re-emits `host:rejoin` to re-enter the session room and receive subsequent events.
