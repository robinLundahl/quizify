# TICKET-049: Glassmorphism design for answer option buttons in player view

**Status:** Done
**Created:** 2026-05-21
**Priority:** Medium

## Description

Replace solid-color answer option buttons with a translucent frosted-glass style that reflects the active session theme.

## Acceptance Criteria

- [x] Multiple-choice option buttons use a glass style (translucent + backdrop-blur + subtle border)
- [x] True/False buttons receive the same treatment
- [x] Each option reflects the theme accent color (via `bg-indigo-500/20` which maps to each theme's remapped indigo variable)
- [x] Selected state is clearly visible (brighter overlay + white ring)
- [x] Disabled state still communicates interaction is locked
- [x] Same treatment applied to HostView option tiles

## Notes

Replaced `OPTION_COLORS` array (solid red/blue/yellow/green fills) with a single `OPTION_GLASS` constant (`bg-indigo-500/20 border border-white/20 backdrop-blur-md`) in both JoinView and HostView. Since each theme remaps `--color-indigo-500`, the tint automatically matches the active theme.
