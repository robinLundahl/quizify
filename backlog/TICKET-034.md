# TICKET-034: Hide final leaderboard from player view

**Status:** Open  
**Created:** 2026-05-19  
**Priority:** Low  

## Description
When the host presses "Show Final Results", the server emits `session:finished` and the player's screen currently transitions to a `finished` phase that displays the full leaderboard with rankings and scores. The host already presents the results on the big screen — players should not see a leaderboard on their own device. Instead, show a simple "Thanks for playing!" screen with no score or ranking information.

## Acceptance Criteria
- [ ] When `session:finished` is received, the player sees a simple end screen — no leaderboard, no rank, no score
- [ ] The end screen shows a thank-you message (e.g. "Thanks for playing!" with a short sub-line)
- [ ] The host avatar can optionally be shown on this screen for continuity
- [ ] `localStorage` is still cleared on `session:finished` (existing behaviour, must not regress)
- [ ] The `myScore` and `leaderboard` state variables can remain — just stop rendering them on the finished screen

## Root cause / location
`client/src/pages/JoinView.tsx` — the `phase === 'finished'` block (currently renders a leaderboard). Replace its content with a minimal thank-you card.

## Notes
- The `leaderboard` and `myScore` state setters in the `session:finished` handler can be removed if desired, but keeping them is harmless
- No server changes needed — `session:finished` payload can continue to include the leaderboard for potential future use
