# TICKET-035: Polish player lobby screen text

**Status:** Done  
**Created:** 2026-05-19  
**Priority:** Low  

## Description
The player lobby screen (shown while waiting for the host to press "Start game") has a few text tweaks needed:

1. "Hosted by Robin Lundahl" → "Quiz hosted by Robin Lundahl"
2. Remove the quiz title pill/badge that sits below the host name
3. The player's nickname is displayed as-is — change it to "Good luck, {nickname}!" so it feels more welcoming

## Acceptance Criteria
- [x] "Hosted by {hostName}" is changed to "Quiz hosted by {hostName}"
- [x] The `quizTitle` pill (`rounded-full border border-white/20 bg-white/15 ...`) is removed from the lobby screen
- [x] The `<h2>` displaying the nickname reads "Good luck, {nickname}!" instead of just `{nickname}`
- [x] All other lobby elements (host avatar, spinner, "Waiting for the host to start…") are unchanged

## Implementation
Shipped in commit b1ac014. Updated the `phase === 'lobby'` block in `JoinView.tsx`: changed the host label text, removed the quizTitle pill div, and updated the nickname heading. Also removed the now-unused `quizTitle` state and its setter call.
