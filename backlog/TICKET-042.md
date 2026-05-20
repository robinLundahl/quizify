# TICKET-042: Add "Ocean" Color Theme

**Status:** Open
**Created:** 2026-05-20
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

## Scope

- Add `ocean` as a selectable theme option in the host's theme selector (HostView and Dashboard).
- Apply the palette to the theme's background gradient, accent colours, and any other theme-driven styles.
- Add the theme label to both `en.json` (`"Ocean"`) and `sv.json` (`"Hav"`).

## Acceptance Criteria

- [ ] `ocean` theme defined in `client/src/lib/theme.ts` (or wherever themes are configured)
- [ ] Theme appears in the host's theme picker with the label "Ocean"
- [ ] Selecting the theme applies the palette visually in the host and player views
- [ ] Label translated in both `en.json` and `sv.json`

## Files Likely Affected

- `client/src/lib/theme.ts` — theme definitions
- `client/src/pages/HostView.tsx` — theme selector options
- `client/src/locales/en.json` — English label
- `client/src/locales/sv.json` — Swedish label
