# TICKET-035: Polish player lobby screen text

**Status:** Open  
**Created:** 2026-05-19  
**Priority:** Low  

## Description
The player lobby screen (shown while waiting for the host to press "Start game") has a few text tweaks needed:

1. "Hosted by Robin Lundahl" → "Quiz hosted by Robin Lundahl"
2. Remove the quiz title pill/badge that sits below the host name
3. The player's nickname is displayed as-is — change it to "Good luck, {nickname}!" so it feels more welcoming

## Acceptance Criteria
- [ ] "Hosted by {hostName}" is changed to "Quiz hosted by {hostName}"
- [ ] The `quizTitle` pill (`rounded-full border border-white/20 bg-white/15 ...`) is removed from the lobby screen
- [ ] The `<h2>` displaying the nickname reads "Good luck, {nickname}!" instead of just `{nickname}`
- [ ] All other lobby elements (host avatar, spinner, "Waiting for the host to start…") are unchanged

## Root cause / location
`client/src/pages/JoinView.tsx` — the `phase === 'lobby'` block (lines ~414–435).

Specific lines:
- Line 425: `Hosted by {hostName}` → `Quiz hosted by {hostName}`
- Lines 427–429: remove the `quizTitle` pill `<div>`
- Line 430: `{nickname}` → `Good luck, {nickname}!`
