# TICKET-039: Sync Host Color Theme to Player Views

**Status:** Done
**Created:** 2026-05-20
**Closed:** 2026-05-20
**Priority:** Medium

## Description

Color themes (Sunset, Forest, Rose, Peach, Dark, Light) are currently only applied on the host's browser via a `localStorage` key and a CSS class on `<html>`. Players joining a session have no knowledge of the host's chosen theme — they always see the default (Forest) regardless of what the host has selected.

The desired behaviour: when a host picks a theme, that theme should be broadcast to all connected players and applied to every player-facing view for the duration of the session. If the host changes theme mid-session the players should update immediately.

## Player-Facing Views to Theme

- Join page (`/join`) — enter game code
- Nickname entry — after code is entered
- Waiting lobby — "Waiting for host to start…"
- Question view — countdown + answer options
- Answer feedback — correct/incorrect reveal
- Leaderboard / between-question screen
- Final results screen

## Proposed Approach

1. **Broadcast theme over Socket.io** — when the host joins or changes theme, emit a `session:theme` event with the theme name. Players receive it and apply it locally.
2. **Persist per session on the server** — store the active theme on `GameSession` (or in-memory on the socket room) so late-joining players can receive the current theme on connect.
3. **Player-side application** — reuse the existing `applyTheme` helper from `client/src/main.tsx` (or extract it to a shared util) so the same CSS class logic runs on the player's `<html>` element.
4. **No player control** — players cannot change the theme themselves; it is host-driven only.

## Acceptance Criteria

- [x] Host's active theme is applied to all player views within the current game session
- [x] Late-joining players receive the correct theme on connect
- [x] Theme updates in real-time if the host changes theme mid-session
- [x] All player-facing views (join, lobby, question, feedback, leaderboard, results) respect the theme
- [x] Players cannot override the theme themselves
- [x] No regression on host views or Light/Dark mode

## Files Likely Affected

- `server/src/socket/gameHandlers.ts` — emit `session:theme` on host join / theme change
- `server/prisma/schema.prisma` — optionally persist theme on `GameSession`
- `client/src/pages/` — player-facing pages (JoinView, PlayerView, etc.)
- `client/src/main.tsx` or a new `client/src/lib/theme.ts` — extract `applyTheme` as a reusable util
- `client/src/store/themeStore.ts` — possibly a read-only player variant

## Notes

Implemented fully in-memory (no schema migration needed). Theme stored in `sessionThemes` Map pre-game and `SessionState.theme` during active game. `applyTheme` extracted to `client/src/lib/theme.ts` and now also sets `<meta name="theme-color">` for iOS Safari chrome. Gradient backgrounds moved from `background-attachment: fixed` (broken on iOS) to direct `html` background to ensure full-screen coverage including safe areas.
