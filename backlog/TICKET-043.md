# TICKET-043: Remove "Thanks for playing" End Screen for Players

**Status:** Open
**Created:** 2026-05-21
**Priority:** Low

## Description

Remove the final "Thanks for playing! Hope you had fun." screen that players see after the quiz ends. This screen is unnecessary — players don't need a dedicated end state on their device.

## Acceptance Criteria

- [ ] The `finished` phase in `JoinView.tsx` no longer renders the thanks screen
- [ ] Players see a neutral/blank state or are returned to the join screen when the session ends

## Files Likely Affected

- `client/src/pages/JoinView.tsx` — remove the `finished` phase render block
