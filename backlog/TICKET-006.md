# TICKET-006: Drag-and-drop question reordering in Quiz Editor

**Status:** Open
**Created:** 2026-05-18
**Priority:** Medium

## Description
When a quiz has multiple questions, the host should be able to reorder them by dragging a question up or down in the list. Currently questions can only be added and deleted — there is no way to change their order without deleting and recreating them.

## Acceptance Criteria
- [ ] Each question row has a drag handle
- [ ] Dragging a question to a new position reorders the list instantly (optimistic UI)
- [ ] The new order is persisted to the server on drop
- [ ] Order is reflected correctly when reloading the quiz editor
- [ ] Works with any number of questions

## Notes
- Questions have an `order` field (Int) in the schema — this is already used for sorting (`orderBy: { order: 'asc' }`)
- On drop, send a PATCH or PUT request to update the `order` values for all affected questions
- Consider `@dnd-kit/core` + `@dnd-kit/sortable` (lightweight, accessible, no extra peer deps issues) or `react-beautiful-dnd`
- The drag handle should be a visible grip icon so it's obvious to users
