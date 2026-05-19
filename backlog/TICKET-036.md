# TICKET-036: Add info tooltip next to "Time (s)" label in question form

**Status:** Open  
**Created:** 2026-05-19  
**Priority:** Low  

## Description
When a host creates or edits a question, the "Time (s)" field has no explanation of what the value means or how it affects scoring. Add a small "ⓘ" icon next to the label that shows a tooltip explaining the time limit and how it relates to point calculation (faster answers earn more points).

## Acceptance Criteria
- [ ] An info icon (ⓘ or similar) appears inline next to the "Time (s)" label
- [ ] Hovering the icon shows a tooltip explaining:
  - The value is the number of seconds players have to answer
  - Points are awarded based on answer speed — faster responses earn more points
- [ ] The tooltip does not interfere with the input field or surrounding layout
- [ ] The icon is subtle (e.g. `text-gray-400 hover:text-gray-600`) and doesn't distract from the form

## Root cause / location
`client/src/pages/QuizEditor.tsx` — the `<label className={LABEL_CLS}>Time (s)</label>` line (around line 479).

Wrap the label content in a `flex items-center gap-1` span and add a `<span title="...">ⓘ</span>` or a custom tooltip component next to it.
