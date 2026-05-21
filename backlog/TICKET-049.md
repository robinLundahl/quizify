# TICKET-049: Glassmorphism design for answer option buttons in player view

**Status:** Open
**Created:** 2026-05-21
**Priority:** Medium

## Description

Replace the solid-color answer option buttons in the player's question view with a translucent, frosted-glass style inspired by Apple's modern UI design language (visionOS / iOS 18). The buttons should feel light and layered rather than opaque and flat.

The new look should use:
- Semi-transparent background with a subtle color tint (not fully opaque)
- `backdrop-blur` for the frosted glass effect
- Soft border with low-opacity white/color stroke
- Retain the A/B/C/D letter badges and the selected-state ring
- Keep the color identity per option (red, blue, yellow, green) but as a tint rather than a solid fill

The same treatment should apply to True/False buttons for consistency.

## Acceptance Criteria

- [ ] Multiple-choice option buttons use a glassmorphism style (translucent + backdrop-blur + subtle border)
- [ ] True/False buttons receive the same treatment
- [ ] Each option retains its color identity as a tint
- [ ] Selected state is still clearly visible (e.g. brighter tint or ring)
- [ ] Disabled state (after submitting) still communicates that interaction is locked

## Files Likely Affected

- `client/src/pages/JoinView.tsx` — `OPTION_COLORS` constant (lines 77–81) and button className strings (lines 533, 553)

## Notes

Reference: Apple's visionOS and iOS 18 use `backdrop-filter: blur` with `background: rgba(255,255,255,0.15)` and a `1px solid rgba(255,255,255,0.3)` border. In Tailwind v4 this maps to `bg-white/15 backdrop-blur-md border border-white/30`. The per-option color tint can be layered on top (e.g. `bg-red-400/30` instead of `bg-red-400`).
