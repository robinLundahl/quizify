# TICKET-064 — Build publish-to-marketplace flow

**Status:** Open  
**Type:** Feature  
**Priority:** Medium

## Goal

Allow creators to publish a quiz to the marketplace. The flow covers setting a price and currency, enforcing pricing constraints, setting metadata (category, language, difficulty), applying a theme (Pro only), and enforcing the free tier 3-quiz publish limit. Themes are baked into the listing at publish time.

## Acceptance criteria

- [ ] Creator can initiate "Publish to marketplace" from their quiz editor
- [ ] Creator sets a buy price with currency selection (USD, SEK, EUR); minimum $0.99
- [ ] Creator can optionally set a rental price; minimum $0.50, maximum 80% of buy price — enforced server-side
- [ ] Creator selects category, language, and difficulty for the listing
- [ ] First two questions are automatically used as the inline preview (server strips correct answers for display)
- [ ] Pro creators can apply a custom theme color that is baked into the listing
- [ ] Free users are blocked from publishing if they already have 3 active listings
- [ ] Unpublishing a quiz frees up a slot (limit tracks currently active listings only)
- [ ] Republishing a taken-down quiz counts as a new publish and uses a slot
- [ ] Edits to a published quiz create a new version in place — no republish required
- [ ] Creator must have completed Stripe Connect onboarding before publishing
