# TICKET-008: Past sessions on dashboard with results access

**Status:** Open
**Created:** 2026-05-18
**Priority:** Medium

## Description
Once a host navigates away from the HostView finished screen, there is no way to get back to the results. The dashboard should show past game sessions for each quiz, tagged with their game code, so the host can identify and revisit results at any time.

## Acceptance Criteria
- [ ] Each quiz on the dashboard shows a list of its finished game sessions
- [ ] Each session entry displays its game code (e.g. `BRUL2K`) and the date it was played
- [ ] Each session entry has a "Results" button that navigates to `/results/:sessionId`
- [ ] Only FINISHED sessions are shown (not WAITING or ACTIVE)
- [ ] Sessions are shown newest first

## Notes
- Requires a new API endpoint or an extension of `GET /api/quiz/:id` to include recent sessions
- Alternatively, extend `GET /api/quiz` (the quiz list) to include a `sessions` array per quiz
- Keep the UI compact — sessions should not dominate the card, consider a collapsible list or showing only the last 3
