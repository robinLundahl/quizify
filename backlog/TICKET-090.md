# TICKET-090 — Fix host not navigating to results when timer expires

**Status:** Open  
**Type:** Bug  
**Priority:** High

## Problem

During live game sessions, the question timer occasionally reaches 0 without the host being navigated to the results view. The timer remains visible and continues pulsing at 0 while the session appears stuck — other clients may also remain unsynchronised. The bug is intermittent and likely involves a race condition between timer expiration, answer submission, and state transitions, or a stale closure / missed WebSocket event on the host client.

## Acceptance criteria

- [ ] Timer expiration always triggers a server-side state transition to the results phase, with no silent failures.
- [ ] The host client always navigates to the results view when the timer reaches 0, even if a real-time event is missed (e.g. via a polling fallback or reconnect reconciliation).
- [ ] All player clients remain synchronised with the host during and after the transition.
- [ ] Stale closures in React effects that consume the timer or socket events are identified and eliminated.
- [ ] Production logs show no unhandled exceptions or stuck session states around timer expiration.
