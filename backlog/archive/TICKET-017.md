# TICKET-017: Replace browser confirm dialog on account delete with a styled modal

**Status:** Done
**Created:** 2026-05-19
**Priority:** Low

## Description
When a user deletes their account, the app triggers a native browser `confirm()` dialog — the same issue we fixed for quiz deletion in TICKET-015. Replace it with a confirmation modal that matches the design system, consistent with the quiz delete modal.

## Acceptance Criteria
- [x] Clicking "Delete account" opens a modal (no native `confirm()` call)
- [x] The modal clearly states that the account will be permanently deleted and warns this cannot be undone
- [x] The modal has a "Cancel" button that closes it without deleting
- [x] The modal has a destructive "Delete account" button that proceeds with deletion
- [x] The modal follows the existing design system — same pattern as the quiz delete modal
- [x] While the delete request is in flight, the confirm button shows a loading state and is disabled

## Notes
- Follow the same implementation pattern used for quiz deletion in `client/src/pages/Dashboard.tsx` (TICKET-015)
- The account delete handler lives in `client/src/pages/Settings.tsx`
