# TICKET-038: Apply Theme to Host Lobby, Finished, and Error Screens

**Status:** Done
**Created:** 2026-05-20
**Closed:** 2026-05-20
**Priority:** Medium

## Description

After the host presses the "Host" button they land on a full-screen lobby (`/host/:sessionId`) that shows the join code and waiting players. This screen — along with the "Final Leaderboard" screen and the rejoin-error screen — is currently hardcoded to `bg-indigo-600` or `bg-gray-900` regardless of the user's chosen theme. It should respond to the dark/light toggle from TICKET-037.

The question and reveal phases already use `bg-gray-900` and look correct in both modes. Only the **lobby**, **finished**, and **rejoin-error** phases need updating.

### Proposed dark-mode treatment

| Phase | Light | Dark |
|---|---|---|
| Lobby | `bg-indigo-600` (current) | `bg-gray-900` with indigo-tinted join code card |
| Finished | `bg-indigo-600` (current) | `bg-gray-900`, leaderboard rows use `bg-white/10` → works fine |
| Rejoin error | `bg-gray-900` (current) | stays `bg-gray-900` — no change needed |

In dark mode the lobby retains brand feel via the indigo join-code display box (`bg-indigo-600/20 border-indigo-500/40`) and a hot-pink "Start Game" button; the white text on full indigo disappears. The finished screen follows the same pattern.

## Acceptance Criteria

- [x] Lobby screen responds to the theme toggle
- [x] Join code card in dark mode is styled with an indigo tint rather than white-on-indigo
- [x] "Start Game" button uses brand colour (`bg-indigo-600`) in dark mode
- [x] Player chips adapt for dark mode
- [x] Finished (leaderboard) screen responds to the theme toggle in the same way
- [x] Question and reveal phases also updated to follow the theme (expanded from original spec per user request)
- [x] Rejoin error screen updated to follow the theme
- [x] Theme persists correctly when navigating from Dashboard → Host lobby

## Implementation Notes

Implemented in commit 2eda1cb. All five HostView phases (lobby, question, reveal, finished, rejoin-error) and ResultsView now use `bg-gray-50 dark:bg-gray-900` with full `dark:` variants throughout. The original spec kept lobby as `bg-indigo-600` in light mode, but the user explicitly requested light-mode surfaces (`bg-gray-50`) instead. Question and reveal phases were also themed (beyond the original scope) per user request.

## Files Changed

- `client/src/pages/HostView.tsx`
- `client/src/pages/ResultsView.tsx`
