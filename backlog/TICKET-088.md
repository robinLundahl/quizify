# TICKET-088 — Fix join button disabled in production

**Status:** Resolved  
**Type:** Bug  
**Priority:** High

## Problem

In production, when a host starts a session, players can successfully enter both the game code and a nickname on the join screen, but the "Join" button remains disabled or unclickable, preventing them from entering the session. This issue blocks the core gameplay flow and prevents any games from being played in production, while working correctly in development.

The root cause needs to be identified by investigating button state logic, validation rules, API requests, production-specific environment differences, CSS/z-index issues, and any JavaScript errors occurring only in production.

## Root Cause Analysis

**The join button was NOT actually disabled** — the button's `disabled` state logic (`!code.trim() || !nickname.trim()`) was working correctly. The real issue was that **Socket.io connections were being blocked by CORS in production**.

### Why it failed in production:

1. **Socket.io CORS was too restrictive**: `server/src/socket/index.ts` only allowed a single origin:
   ```typescript
   origin: process.env['CLIENT_URL'] ?? 'http://localhost:5173'
   ```

2. **Production has two domains**:
   - `https://quizcraft.online`
   - `https://www.quizcraft.online`

3. **When users visited from the "www" subdomain**, but `CLIENT_URL` was set to the non-www version, Socket.io rejected the connection due to CORS mismatch.

4. **Without a Socket.io connection**, the join button appeared clickable but did nothing — the `socket.emit('player:join', ...)` call failed silently.

### Why it worked in development:

- In dev, both client and server run on `localhost`, so there's no cross-origin issue
- Single origin (`http://localhost:5173`) matches perfectly

## Resolution

Updated Socket.io CORS configuration in `server/src/socket/index.ts` to match the Express CORS setup:
- Allow both `quizcraft.online` and `www.quizcraft.online`
- Allow all Vercel preview deployments (`*.vercel.app`)
- Allow local development (`localhost:5173`)
- Use a dynamic origin validator function instead of a single string

This ensures Socket.io connections work regardless of which production domain players use.

## Acceptance criteria

- [x] Identify the exact root cause of why the join button is disabled in production
- [x] Document why the issue occurs only in production (environment differences, API endpoints, CORS, etc.)
- [x] Implement a fix that enables the join button when valid game code and nickname are entered
- [ ] Verify the fix works in production by testing the full join flow end-to-end
- [ ] Ensure no JavaScript errors or failed API requests occur during the join process
