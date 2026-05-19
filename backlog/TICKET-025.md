# TICKET-025: Add image upload option to Ranking question type

**Status:** Open
**Created:** 2026-05-19
**Priority:** Medium

## Description
When creating or editing a RANKING question in the quiz editor, the host currently has no way to attach an image to the question. The IMAGE question type already supports image uploads — the same capability should be available for RANKING questions.

## Acceptance Criteria

- [ ] A RANKING question in the quiz editor has an optional image field (URL input or upload)
- [ ] If an image is provided, it is saved and returned with the question data
- [ ] The image is displayed to players during the question phase in `JoinView.tsx`
- [ ] The image is displayed on the host screen during the question phase in `HostView.tsx`
- [ ] If no image is provided, the question behaves exactly as before (no regression)

## Notes
- The `Question` model already has an `imageUrl String?` field — no schema change needed
- The IMAGE question type in `QuizEditor.tsx` has an image URL input that can be reused or referenced
- The server routes (`PUT /quiz/:id/questions/:qid`) already handle `imageUrl` — no backend change needed
- The fix is purely in the quiz editor UI: add the image field to the RANKING question form section (similar to how IMAGE type shows it)
- In `JoinView.tsx` and `HostView.tsx`, the image is already rendered for IMAGE questions — check if RANKING questions need to be added to that condition
