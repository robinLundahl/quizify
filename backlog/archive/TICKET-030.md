# TICKET-030: Simplify player reveal screen to waiting state

**Status:** Done  
**Created:** 2026-05-19  
**Priority:** Low  

## Description
After a question ends, the player's reveal screen currently shows points earned, the correct answer, their rank, and their total score. The host screen already shows the correct answer and leaderboard to everyone on the big screen. On the player device, all of this information should be replaced with a minimal waiting screen: a pulsing host avatar and the text "Waiting for next question".

## Acceptance Criteria
- [x] The reveal phase in `JoinView` no longer shows points earned, correct answer, rank, or total score
- [x] Instead the screen shows the host avatar (pulsing with `animate-pulse`) above the text "Waiting for next question"
- [x] If the host has no avatar, show the host's initial in a pulsing circle (matching the lobby fallback style)
- [x] The background remains `bg-gray-900` (dark, consistent with the question phase)

## Root cause / location
`client/src/pages/JoinView.tsx` — the `phase === 'reveal'` block. The `hostAvatar` and `hostName` state values are already available in the component.

## Notes
- The `pointsEarned`, `correctAnswer`, `leaderboard`, and `myScore` state can remain — they are used elsewhere
- The `myRank` local variable inside the reveal block was removed since it is no longer displayed
- Keep the `answered` phase screen unchanged

## Implementation
Shipped in commit e7adb7c as part of the broader UI redesign. Reveal phase replaced with pulsing host avatar + "Waiting for next question…" text on `bg-gray-900`.
