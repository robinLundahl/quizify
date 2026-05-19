# TICKET-032: Remove points display from player question header

**Status:** Done  
**Created:** 2026-05-19  
**Priority:** Low  

## Description
During a game session, the player's question screen shows the current score in the top-right corner of the header bar. This should be removed — players don't need to track their running total mid-question.

## Acceptance Criteria
- [x] The `{myScore.toLocaleString()} pts` span in the question phase header is removed from `JoinView.tsx`
- [x] The header bar still shows the question counter (left) and the timer (centre/right)
- [x] The `myScore` state variable is kept — it is still used on the finished screen

## Implementation
Shipped in commit a3d7cbb. Removed the score `<span>` from the `bg-white/5 rounded-xl` header pill in the question phase of `JoinView.tsx`. The `myScore` state is untouched.
