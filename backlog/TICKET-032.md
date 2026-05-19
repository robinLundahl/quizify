# TICKET-032: Remove points display from player question header

**Status:** Open  
**Created:** 2026-05-19  
**Priority:** Low  

## Description
During a game session, the player's question screen shows the current score in the top-right corner of the header bar. This should be removed — players don't need to track their running total mid-question.

## Acceptance Criteria
- [ ] The `{myScore.toLocaleString()} pts` span in the question phase header is removed from `JoinView.tsx`
- [ ] The header bar still shows the question counter (left) and the timer (centre)
- [ ] The `myScore` state variable is kept — it is still used on the finished screen

## Files to change
- `client/src/pages/JoinView.tsx` — remove the score span from the question phase header bar (the `mx-4 mt-3 flex … rounded-xl bg-white/5` row)

## Notes
- The `myScore` state itself must not be deleted; it populates the finished screen leaderboard entry ("You finished #N with X pts")
- The right-hand slot in the header can simply be removed, leaving counter on the left and timer centred (or the timer can be centred absolutely if desired)
