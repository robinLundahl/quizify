# TICKET-042: Add "Ocean" Color Theme

**Status:** Done
**Created:** 2026-05-20
**Completed:** 2026-05-20
**Priority:** Low

## Description

Add a new color theme called **Ocean** to the quiz platform using the following palette:

| Swatch | Hex       |
| ------ | --------- |
| 1      | `#e4f1e1` |
| 2      | `#b4d9cc` |
| 3      | `#89c0b6` |
| 4      | `#63a6a0` |
| 5      | `#448c8a` |
| 6      | `#287274` |
| 7      | `#0d585f` |

## Acceptance Criteria

- [x] `ocean` theme defined in `client/src/lib/theme.ts`
- [x] Theme appears in the host's theme picker with the label "Ocean" in both HostView and Dashboard
- [x] Selecting the theme applies the teal palette visually via CSS custom properties and radial gradient background
- [x] Label translated in both `en.json` (Ocean) and `sv.json` (Hav)
