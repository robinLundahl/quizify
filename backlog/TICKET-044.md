# TICKET-044: Change Order of Color Themes in Dropdown

**Status:** Open
**Created:** 2026-05-21
**Priority:** Low

## Description

Change the order in which color themes appear in the theme dropdown list (present in both the Host view and the Dashboard). The current order is not intentional.

## Acceptance Criteria

- [ ] Theme dropdown in `HostView.tsx` lists themes in the desired order
- [ ] Theme dropdown in `Dashboard.tsx` matches the same order

## Files Likely Affected

- `client/src/pages/HostView.tsx` — reorder `<option>` elements in the theme selector
- `client/src/pages/Dashboard.tsx` — reorder `<option>` elements in the theme selector
