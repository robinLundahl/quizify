# TICKET-020: Replace native confirm() on question delete with custom modal

**Status:** Open
**Created:** 2026-05-19
**Priority:** Medium

## Description
When deleting a question in the quiz editor, the browser's native `confirm()` popup is used. Replace it with a styled confirmation modal consistent with the one already used when deleting a quiz on the Dashboard.

## Acceptance Criteria

- [ ] Remove the `confirm()` call in `QuizEditor.tsx` (`QuestionCard` delete button, line ~745)
- [ ] Add a confirmation modal to the quiz editor that matches the style of the delete-quiz modal in `Dashboard.tsx` — shows the question text, a warning that the action cannot be undone, and Cancel / Delete buttons
- [ ] Clicking Delete in the modal calls `deleteQuestion.mutate()`, which removes the question from the database and updates the quiz
- [ ] The modal is dismissed on Cancel or after a successful delete
- [ ] The Delete button is disabled and shows a loading state while the request is in flight

## Notes
- The quiz delete modal in `Dashboard.tsx` uses a `confirmDelete` state (`{ id, title } | null`) to track which item is pending deletion — apply the same pattern for questions
- `useDeleteQuestion` already calls `DELETE /quiz/:id/questions/:qid` and invalidates the quiz query, so the question disappears from the list on success — no backend changes needed
