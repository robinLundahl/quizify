# TICKET-047: (Bug) Player count resets to 0 when host rejoins lobby

**Status:** Done
**Created:** 2026-05-21
**Priority:** High

## Description

If a host opens a session, players join the lobby, and the host then navigates back to the dashboard and re-enters the session, the "Players joined" count shown in the lobby resets to 0 — even though those players are still connected and waiting.

## Acceptance Criteria

- [x] When the host re-enters a WAITING session, the lobby immediately shows the correct number of already-joined players
- [x] Player nickname chips are displayed correctly on rejoin
- [x] Newly joining players continue to appear in real time as before

## Notes

Fixed by having the `host:join` handler query `prisma.participant.findMany` and emit the existing nickname list back via a new `host:joined` event. `HostView` listens for `host:joined` and seeds the `players` state from that response. The `session:player_joined` listener continues to handle new arrivals in real time.
