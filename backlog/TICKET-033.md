# TICKET-033: Show "Thank you" message on final question reveal

**Status:** Open  
**Created:** 2026-05-19  
**Priority:** Low  

## Description
After the last question of a quiz ends, the player's reveal screen currently shows the same "Waiting for next question…" message as every other round. On the final question there is no next question — the host is about to end the session. The message should reflect that and feel like a proper closing moment.

## Acceptance Criteria
- [ ] When the reveal phase is reached and the current question is the last one (`index + 1 === total`), the player screen shows a "Thank you for participating!" message instead of "Waiting for next question…"
- [ ] The host avatar still pulses on both the regular and final reveal screens
- [ ] The regular "Waiting for next question…" message is unchanged for all non-final rounds

## Root cause / location
`client/src/pages/JoinView.tsx` — the `phase === 'reveal'` block. The `currentQuestion` state already holds `{ index, total }`, so `currentQuestion.index + 1 === currentQuestion.total` can be used to detect the final round.

## Notes
- `currentQuestion` is set before the phase transitions to `'reveal'` (via `session:question_ended`), so it is always available when rendering the reveal phase
- The sub-text can also differ: e.g. "The host will show the final results shortly." for the last round vs the generic waiting message
- Keep the background and avatar styling identical between regular and final reveal
