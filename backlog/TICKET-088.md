# TICKET-088 — Fix join button disabled in production

**Status:** Open  
**Type:** Bug  
**Priority:** High

## Problem

In production, when a host starts a session, players can successfully enter both the game code and a nickname on the join screen, but the "Join" button remains disabled or unclickable, preventing them from entering the session. This issue blocks the core gameplay flow and prevents any games from being played in production, while working correctly in development.

The root cause needs to be identified by investigating button state logic, validation rules, API requests, production-specific environment differences, CSS/z-index issues, and any JavaScript errors occurring only in production.

## Acceptance criteria

- [ ] Identify the exact root cause of why the join button is disabled in production
- [ ] Document why the issue occurs only in production (environment differences, API endpoints, CORS, etc.)
- [ ] Implement a fix that enables the join button when valid game code and nickname are entered
- [ ] Verify the fix works in production by testing the full join flow end-to-end
- [ ] Ensure no JavaScript errors or failed API requests occur during the join process
