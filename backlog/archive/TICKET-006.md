# TICKET-006: Drag-and-drop question reordering in Quiz Editor

**Status:** Done
**Created:** 2026-05-18
**Priority:** Medium

## Description
When a quiz has multiple questions, the host should be able to reorder them by dragging a question up or down in the list. Currently questions can only be added and deleted — there is no way to change their order without deleting and recreating them.

## Acceptance Criteria
- [x] Each question row has a drag handle
- [x] Dragging a question to a new position reorders the list instantly (optimistic UI)
- [x] The new order is persisted to the server on drop
- [x] Order is reflected correctly when reloading the quiz editor
- [x] Works with any number of questions

## Notes
- Implemented with `@dnd-kit/core` + `@dnd-kit/sortable`
- `PATCH /api/quiz/:id/questions/reorder` updates all order values in a single Prisma transaction
- `useReorderQuestions` hook handles optimistic cache update and rollback on error
- Drag handle is a six-dot grip icon; dragging is disabled when a card is in edit mode
