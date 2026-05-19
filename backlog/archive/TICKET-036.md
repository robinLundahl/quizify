# TICKET-036: Add info tooltip next to "Time (s)" label in question form

**Status:** Done  
**Created:** 2026-05-19  
**Priority:** Low  

## Description
When a host creates or edits a question, the "Time (s)" field has no explanation of what the value means or how it affects scoring. Add a small "ⓘ" icon next to the label that shows a tooltip explaining the time limit and how it relates to point calculation (faster answers earn more points).

## Acceptance Criteria
- [x] An info icon (ⓘ) appears inline next to the "Time (s)" label
- [x] Hovering the icon shows a tooltip: "The amount of seconds a player has to answer a question. The quicker they respond, the more points they score."
- [x] The tooltip does not interfere with the input field or surrounding layout
- [x] The icon is subtle (`text-gray-400 hover:text-gray-600`) and doesn't distract from the form

## Implementation
Shipped in commit ff42dc6. Replaced the plain `<label>` with a flex row containing the label text and a `group`-based CSS tooltip in `QuizEditor.tsx` around line 479.
