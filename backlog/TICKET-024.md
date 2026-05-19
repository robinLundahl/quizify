# TICKET-024: Show host avatar and name on the player waiting screen

**Status:** Open
**Created:** 2026-05-19
**Priority:** Low

## Description
When a player joins a game and is waiting for the host to start, the waiting screen should display the host's avatar above the quiz title, followed by a line such as "Your host today is Robin Lundahl." The host name should reflect whoever is actually hosting the session.

## Acceptance Criteria

- [ ] The host's avatar is displayed above the quiz title on the player waiting screen
- [ ] Below the avatar, a line reads "Your host today is [Host Name]" using the actual host's name
- [ ] If the host has no avatar set, a fallback (e.g. initials placeholder) is shown instead
- [ ] The quiz title remains visible below the host info

## Notes
- The player waiting screen is in `client/src/pages/JoinView.tsx` — the `waiting` phase renders the quiz name and a "Waiting for host…" message
- The host's name and avatar need to be sent to joining players — check whether the `session:joined` socket event payload already includes host info, or whether it needs to be added to `server/src/socket/gameHandlers.ts`
- The `User` model has `name` and `avatar` fields (see `server/prisma/schema.prisma`) — avatar may be `null` for non-OAuth users
- Follow the same avatar pattern used in `NavDropdown` or `Settings.tsx` for the fallback initials display
