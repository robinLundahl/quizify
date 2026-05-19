# TICKET-019: Add ranking question type

**Status:** Open
**Created:** 2026-05-19
**Priority:** Medium

## Description
Add a new `RANKING` question type. The host creates a question with a list of items that have a defined correct order. During the game, players drag (or tap) items into the order they think is correct. Points are awarded per item placed in the correct position.

## Acceptance Criteria

### Schema
- [ ] Add `RANKING` to the `QuestionType` enum in `server/prisma/schema.prisma`
- [ ] Add a `RankingItem` model with fields: `id`, `questionId`, `label` (text), `correctPosition` (int, 1-based), `order` (display order shown to player — shuffled from correct order)
- [ ] Run migration and regenerate Prisma client

### Quiz editor
- [ ] `RANKING` appears as a selectable question type alongside existing types
- [ ] When `RANKING` is selected, the editor shows a list of items the host can add, edit, and remove
- [ ] Each item has a text label
- [ ] The host arranges items in the correct order by dragging or using up/down controls — this order is saved as `correctPosition`
- [ ] At least 2 items required; editor enforces this before saving

### Game — host view
- [ ] Ranking questions display the question text and a placeholder list (items shown in shuffled order so the correct answer isn't revealed on the host screen)

### Game — player view
- [ ] Items are displayed in a randomised order (shuffled from correct order)
- [ ] Player can reorder items by dragging or tapping up/down arrows
- [ ] Submitting locks the order and sends it to the server

### Scoring
- [ ] Server compares each item's submitted position against `correctPosition`
- [ ] Points awarded per correctly placed item (e.g. if 4 items and base points = 1000, each correct position is worth 250 points, scaled by response time)
- [ ] Partial credit is supported — a player can score for some items even if not all are correct

## Notes
- Follow the same pattern used for `MapQuestion` (companion model joined to `Question`) for the `RankingItem` rows
- Shuffling of item display order should happen on the server when sending the question to players, not stored in the DB
- This is a large feature — consider breaking into sub-tasks: (1) schema + editor, (2) game player UI, (3) scoring
