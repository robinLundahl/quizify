# TICKET-018: Add pointer cursor to session delete button on quiz cards

**Status:** Open
**Created:** 2026-05-19
**Priority:** Low

## Description
The trash can icon button on quiz cards in the dashboard does not change the cursor to a pointer on hover. It should show the hand/finger cursor to signal it is clickable, consistent with all other interactive buttons on the page.

## Acceptance Criteria
- [ ] Hovering over the trash can button on a quiz card shows a pointer cursor (`cursor-pointer`)

## Notes
- The button is in `client/src/pages/Dashboard.tsx` in the past sessions section of each quiz card
