# TICKET-024: Show host avatar and name on the player waiting screen

**Status:** Done
**Created:** 2026-05-19
**Priority:** Low

## Description
When a player joins a game and is waiting for the host to start, the waiting screen should display the host's avatar above the quiz title, followed by a line such as "Your host today is Robin Lundahl."

## Acceptance Criteria

- [x] The host's avatar is displayed above the quiz title on the player waiting screen
- [x] Below the avatar, a line reads "Your host today is [Host Name]" using the actual host's name
- [x] If the host has no avatar set, a fallback (initials placeholder) is shown instead
- [x] The quiz title remains visible below the host info

## Done
Added `host: { select: { name: true, avatar: true } }` to the `player:join` Prisma query in `gameHandlers.ts` and included `hostName`/`hostAvatar` in the `player:joined` socket payload. Updated the lobby phase in `JoinView.tsx` to render the avatar (or initials fallback) and "Your host today is [name]" above the quiz title.
