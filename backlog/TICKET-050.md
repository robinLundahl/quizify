# TICKET-050: (Bug) Host avatar missing after player page refresh during session

**Status:** Open
**Created:** 2026-05-21
**Priority:** Medium

## Description

If a player refreshes the page while inside an active session, they are reconnected via `player:reconnect_success` but the host's avatar and name are not included in that payload. As a result `hostAvatar` and `hostName` stay at their initial empty values, so the "Waiting for next question" screen shows only the initial-letter placeholder instead of the host's real avatar.

## Root Cause

- `player:joined` (initial join) includes `hostName` and `hostAvatar` — these are stored in React state.
- `player:reconnect_success` (page-refresh reconnect) does **not** include host data — React state resets to `''` / `null` and is never repopulated.
- The server's `player:reconnect` handler queries `prisma.gameSession.findUnique` without including the host relation, so it has no host data to send.

## Acceptance Criteria

- [ ] After a page refresh mid-session, the "Waiting for next question" screen shows the host's real avatar (or initial placeholder if the host has no avatar) — same as on first join
- [ ] `hostName` is also restored correctly so the fallback initial letter is correct

## Files Likely Affected

- `server/src/socket/gameHandlers.ts` — `player:reconnect` handler: add `include: { host: { select: { name: true, avatar: true } } }` to the `gameSession.findUnique` call; include `hostName` and `hostAvatar` in both `player:reconnect_success` emits
- `client/src/pages/JoinView.tsx` — `player:reconnect_success` handler: read `hostName` and `hostAvatar` from the payload and call `setHostName` / `setHostAvatar`
