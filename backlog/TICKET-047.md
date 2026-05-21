# TICKET-047: (Bug) Player count resets to 0 when host rejoins lobby

**Status:** Open
**Created:** 2026-05-21
**Priority:** High

## Description

If a host opens a session, players join the lobby, and the host then navigates back to the dashboard and re-enters the session, the "Players joined" count shown in the lobby resets to 0 — even though those players are still connected and waiting.

## Root Cause

The `players` list in `HostView` is populated entirely from real-time `session:player_joined` socket events. When the host returns to a WAITING (lobby) session, the client emits `host:join`. The server's `host:join` handler only joins the socket room and emits `session:theme` — it never queries or returns the current participant list. So the React state starts at `[]` and no existing players are shown until new players join after the reconnect.

The `host:rejoin` path (which does return participant data) is gated on `status === 'ACTIVE'`, so it is never triggered for lobby sessions.

## Acceptance Criteria

- [ ] When the host re-enters a WAITING session, the lobby immediately shows the correct number of already-joined players
- [ ] Player nickname chips are displayed correctly on rejoin
- [ ] Newly joining players continue to appear in real time as before

## Files Likely Affected

- `server/src/socket/gameHandlers.ts` — `host:join` handler: query `prisma.participant.findMany` and emit the existing participant list back to the host socket
- `client/src/pages/HostView.tsx` — listen for and apply the initial participant list returned by `host:join`

## Notes

The simplest fix is to have `host:join` return the current participant list alongside the theme, and have `HostView` seed the `players` state from that response. The existing `session:player_joined` listener continues to handle new arrivals in real time.
