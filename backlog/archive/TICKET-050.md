# TICKET-050: (Bug) Host avatar missing after player page refresh during session

**Status:** Done
**Created:** 2026-05-21
**Priority:** Medium

## Description

If a player refreshes the page mid-session, they reconnect via `player:reconnect_success` but the host avatar and name were missing from that payload, causing the fallback placeholder to show on the "Waiting for next question" screen.

## Acceptance Criteria

- [x] After a page refresh mid-session, the "Waiting for next question" screen shows the host's real avatar
- [x] `hostName` is also restored correctly so the fallback initial letter is correct

## Notes

Added `include: { host: { select: { name: true, avatar: true } } }` to the `gameSession.findUnique` call in the `player:reconnect` handler. Both `player:reconnect_success` emits now include `hostName` and `hostAvatar`. JoinView reads these fields and calls `setHostName` / `setHostAvatar` on reconnect.
