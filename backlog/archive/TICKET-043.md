# TICKET-043: Remove "Thanks for playing" End Screen for Players

**Status:** Done
**Created:** 2026-05-21
**Completed:** 2026-05-21
**Priority:** Low

## Description

Remove the final "Thanks for playing! Hope you had fun." screen that players see after the quiz ends. Players now stay on the reveal phase screen showing "Thank you for participating! The host will present the winner shortly." when the host presses Show Final Results.

## Acceptance Criteria

- [x] The `finished` phase render block removed from `JoinView.tsx`
- [x] `session:finished` no longer changes the player's phase — they remain on the reveal screen
- [x] Session keys are still cleared from localStorage on finish

## Notes

Rather than showing a blank screen, the player stays on the existing final-round reveal phase which already shows the appropriate waiting message.
