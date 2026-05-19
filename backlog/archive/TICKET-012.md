# TICKET-012: Nav improvements — dashboard link in dropdown and clickable logo

**Status:** Done  
**Created:** 2026-05-19  
**Priority:** Low  

## Description
Users on the Settings page (and any other page without a back button) have no way to return to the dashboard. Two small nav improvements fix this: a Dashboard item in the NavDropdown, and a clickable Quizify logo.

## Acceptance Criteria
- [x] `NavDropdown` has a **Dashboard** item at the top of the menu that navigates to `/dashboard`
- [x] The **Quizify** logo in `Dashboard.tsx` and `Settings.tsx` is a `<Link>` to `/dashboard`

## Notes
- `QuizEditor` header has no logo — the existing "← Dashboard" back button already handles navigation there.
- `NavDropdown` was the single component changed for the dropdown item.

## Done
Shipped in commit 26b09be. Dashboard item added to NavDropdown; Quizify logo made a Link in Dashboard and Settings.
