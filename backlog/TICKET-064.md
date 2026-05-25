# TICKET-064 — Build publish-to-marketplace flow

**Status:** Open  
**Type:** Feature  
**Priority:** Medium

## Goal

Allow creators to publish a quiz to the marketplace. The flow covers setting a price, selecting demo questions, applying a theme (Pro only), and enforcing the free tier 3-quiz publish limit. Themes are baked into the listing at publish time.

## Acceptance criteria

- [ ] Creator can initiate "Publish to marketplace" from their quiz editor
- [ ] Creator sets a price for the quiz
- [ ] Creator selects 1–2 demo questions; auto-selects first two if none chosen
- [ ] Pro creators can apply a custom theme color that is baked into the listing
- [ ] Free users are blocked from publishing if they already have 3 active listings
- [ ] Unpublishing a quiz frees up a slot (limit tracks currently active listings only)
- [ ] Republishing a taken-down quiz counts as a new publish and uses a slot
- [ ] Edits to a published quiz create a new version in place — no republish required
