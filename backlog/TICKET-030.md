# TICKET-030: Simplify player reveal screen to waiting state

**Status:** Open  
**Created:** 2026-05-19  
**Priority:** Low  

## Description
After a question ends, the player's reveal screen currently shows points earned, the correct answer, their rank, and their total score. The host screen already shows the correct answer and leaderboard to everyone on the big screen. On the player device, all of this information should be replaced with a minimal waiting screen: a pulsing host avatar and the text "Waiting for next question".

## Acceptance Criteria
- [ ] The reveal phase in `JoinView` no longer shows points earned, correct answer, rank, or total score
- [ ] Instead the screen shows the host avatar (pulsing with `animate-pulse`) above the text "Waiting for next question"
- [ ] If the host has no avatar, show the host's initial in a pulsing circle (matching the lobby fallback style)
- [ ] The background remains `bg-gray-900` (dark, consistent with the question phase)

## Root cause / location
`client/src/pages/JoinView.tsx` — the `phase === 'reveal'` block (currently lines 487–529). The `hostAvatar` and `hostName` state values are already available in the component (set on `player:joined` and restored on `player:reconnect_success`).

## Notes
- The `pointsEarned`, `correctAnswer`, `leaderboard`, and `myScore` state can remain — they are used elsewhere (finished screen uses `myScore`; reconnect logic sets them) — just stop rendering them in the reveal block
- The `myRank` local variable inside the reveal block can be removed since it will no longer be displayed
- Keep the `answered` phase screen unchanged — it already just shows "Answer submitted!" and a spinner
