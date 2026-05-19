# TICKET-015: Replace browser confirm dialog on quiz delete with a styled modal

**Status:** Open
**Created:** 2026-05-19
**Priority:** Low

## Description
When a user deletes a quiz, the app currently triggers a native browser `confirm()` dialog. This is visually jarring and inconsistent with the rest of the UI. Replace it with a confirmation modal that matches the design system.

## Acceptance Criteria
- [ ] Clicking "Delete" opens a modal (no native `confirm()` call)
- [ ] The modal clearly states which quiz will be deleted and asks for confirmation
- [ ] The modal has a "Cancel" button that closes it without deleting
- [ ] The modal has a destructive "Delete" button that proceeds with deletion
- [ ] The modal follows the existing design system (colours, typography, spacing, button styles)
- [ ] While the delete request is in flight, the confirm button shows a loading state and is disabled

## Notes
- The current `confirm()` call is in the quiz delete handler on the dashboard/quiz list view
- No new dependency needed — implement as a local React component or reuse any existing modal/dialog pattern in the codebase
