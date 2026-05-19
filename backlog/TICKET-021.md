# TICKET-021: Make ranking items draggable in the quiz editor

**Status:** Open
**Created:** 2026-05-19
**Priority:** Medium

## Description
When creating or editing a RANKING question in the quiz editor, items are currently reordered using up/down arrow buttons. Replace these with drag-to-reorder using `@dnd-kit/sortable` (already installed), consistent with how questions are reordered on the editor page itself.

## Acceptance Criteria

- [ ] Ranking items in `QuestionForm` are draggable via a drag handle
- [ ] Dragging an item reorders it in the list and updates `correctPosition` accordingly on save
- [ ] The up/down arrow buttons are removed
- [ ] A minimum of 2 items is still enforced before saving

## Notes
- `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` are already installed in `client/`
- The main `QuizEditor` page already wraps question cards in a `DndContext` — the ranking items editor inside `QuestionForm` will need its own nested `DndContext`, which @dnd-kit supports
- The player view (`JoinView.tsx`) already uses `@dnd-kit` with a `SortableContext` for ranking answers — follow the same `SortableContext` + `useSortable` pattern used there
- The `moveRankingItem` function and arrow button handlers in `QuestionForm` can be removed entirely once drag is wired up
