# TICKET-033: Show "Thank you" message on final question reveal

**Status:** Done  
**Created:** 2026-05-19  
**Priority:** Low  

## Description
After the last question of a quiz ends, the player's reveal screen currently shows the same "Waiting for next question…" message as every other round. On the final question there is no next question — the host is about to end the session. The message should reflect that and feel like a proper closing moment.

## Acceptance Criteria
- [x] When the reveal phase is reached and the current question is the last one (`index + 1 === total`), the player screen shows a "Thank you for participating!" message instead of "Waiting for next question…"
- [x] The host avatar still pulses on both the regular and final reveal screens
- [x] The regular "Waiting for next question…" message is unchanged for all non-final rounds

## Implementation
Shipped in commit 317ce5b. Added `isFinalRound` check in the reveal block of `JoinView.tsx` using `currentQuestion.index + 1 === currentQuestion.total`. Final round shows "Thank you for participating!" + "The host will present the winner shortly." Sub-text was updated from "The host will show the final results shortly." to "The host will present the winner shortly." per user request.
