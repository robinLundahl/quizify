# TICKET-038: Apply Theme to Host Lobby, Finished, and Error Screens

**Status:** Open
**Created:** 2026-05-20
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

- [ ] Lobby screen responds to the theme toggle: `bg-indigo-600` in light, `bg-gray-900` in dark
- [ ] Join code card in dark mode is styled with an indigo tint rather than white-on-indigo
- [ ] "Start Game" button uses brand colour (`bg-indigo-600`) in dark mode instead of the white reverse button
- [ ] Player chips adapt for dark mode
- [ ] Finished (leaderboard) screen responds to the theme toggle in the same way
- [ ] Question and reveal phases are **untouched** — they already look correct
- [ ] Rejoin error screen is **untouched** — already `bg-gray-900`
- [ ] Theme persists correctly when navigating from Dashboard → Host lobby

## Implementation Notes

- Read `useThemeStore` in `HostView.tsx` and apply `dark:` class variants (or a conditional className) to the lobby and finished phase root divs
- Tailwind v4 `dark:` variant is already enabled globally (TICKET-037)
- Keep the `bg-indigo-600` lobby in light mode — it matches the design system's "Host lobby → `bg-indigo-600` full-screen" spec

## Files to Change

- `client/src/pages/HostView.tsx` — lobby and finished phase JSX only
