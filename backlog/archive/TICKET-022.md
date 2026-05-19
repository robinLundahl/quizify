# TICKET-022: Navigate to dashboard after saving a quiz

**Status:** Done
**Created:** 2026-05-19
**Priority:** Medium

## Description
After pressing "Save" when creating or editing a quiz in the quiz editor, the user stays on the editor page. They should be automatically navigated back to the dashboard once the save succeeds.

## Acceptance Criteria

- [x] After a successful save in the quiz editor, the user is redirected to `/dashboard`
- [x] If the save fails (network error, validation error, etc.), the user stays on the editor page and the error is visible
- [x] Navigation only happens on success — not while the request is in flight

## Notes
- Added `{ onSuccess: () => navigate('/dashboard') }` to `updateQuiz.mutate()` in `QuizEditor.tsx`
