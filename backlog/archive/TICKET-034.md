# TICKET-034: Hide final leaderboard from player view

**Status:** Done  
**Created:** 2026-05-19  
**Priority:** Low  

## Description
When the host presses "Show Final Results", the server emits `session:finished` and the player's screen currently transitions to a `finished` phase that displays the full leaderboard with rankings and scores. The host already presents the results on the big screen — players should not see a leaderboard on their own device. Instead, show a simple "Thanks for playing!" screen with no score or ranking information.

## Acceptance Criteria
- [x] When `session:finished` is received, the player sees a simple end screen — no leaderboard, no rank, no score
- [x] The end screen shows a thank-you message ("Thanks for playing!" + "Hope you had fun.")
- [x] The host avatar is shown on this screen for continuity
- [x] `localStorage` is still cleared on `session:finished` (existing behaviour, must not regress)
- [x] The `myScore` and `leaderboard` state variables removed along with `participantId`, `MEDALS`

## Implementation
Shipped in commit 1055db9. Replaced the finished-phase leaderboard in `JoinView.tsx` with a minimal thank-you card showing the host avatar, "Thanks for playing!", and "Hope you had fun." Removed unused state (`participantId`, `leaderboard`, `myScore`) and the `MEDALS` constant throughout the component.
