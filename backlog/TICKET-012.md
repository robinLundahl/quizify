# TICKET-012: Nav improvements — dashboard link in dropdown and clickable logo

**Status:** Open  
**Created:** 2026-05-19  
**Priority:** Low  

## Description
Users on the Settings page (and any other page without a back button) have no way to return to the dashboard. Two small nav improvements fix this: a Dashboard item in the NavDropdown, and a clickable Quizify logo.

## Acceptance Criteria
- [ ] `NavDropdown` has a **Dashboard** item at the top of the menu that navigates to `/dashboard`
- [ ] The **Quizify** logo in every page header (`Dashboard`, `QuizEditor`, `Settings`) is a `<Link>` to `/dashboard`

## Notes
- The logo in `QuizEditor` is not currently rendered — the header only shows "← Dashboard | quiz title". No logo change needed there; the existing back button already handles navigation.
- Only `Dashboard.tsx` and `Settings.tsx` render the Quizify wordmark — both need updating.
- `NavDropdown` is the single component to change for the dropdown item.
