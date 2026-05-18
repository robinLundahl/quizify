# TICKET-005: Fix question points input — allow 1 and up

**Status:** Open
**Created:** 2026-05-18
**Priority:** Low

## Description
When editing a question in the Quiz Editor, the points field currently jumps in steps of 100 (or behaves as if the minimum usable value is 100). The field should allow any integer from 1 upward so hosts can award e.g. 1, 5, 50, or 250 points per question.

## Acceptance Criteria
- [ ] Points input accepts any integer ≥ 1
- [ ] Stepping up/down from the input moves in increments of 1 (or a small sensible step like 10)
- [ ] Saving a question with e.g. 5 points persists and reloads correctly
- [ ] The default value of 1000 points is unchanged

## Notes
- The input is in the question form inside `client/src/pages/QuizEditor.tsx`
- Likely a `step` or `min` attribute issue on the `<input type="number">` element
