# TICKET-005: Fix question points input — allow 1 and up

**Status:** Done
**Created:** 2026-05-18
**Priority:** Low

## Description
When editing a question in the Quiz Editor, the points field currently jumps in steps of 100 (or behaves as if the minimum usable value is 100). The field should allow any integer from 1 upward so hosts can award e.g. 1, 5, 50, or 250 points per question.

## Acceptance Criteria
- [x] Points input accepts any integer ≥ 1
- [x] Stepping up/down from the input moves in increments of 1 (or a small sensible step like 10)
- [x] Saving a question with e.g. 5 points persists and reloads correctly
- [x] The default value of 1000 points is unchanged

## Notes
- Fixed in `client/src/pages/QuizEditor.tsx` — changed `min={0} step={100}` to `min={1} step={1}`
