# TICKET-064 — Build publish-to-marketplace flow

**Status:** Shipped  
**Type:** Feature  
**Priority:** Medium

## Goal

Allow creators to publish a quiz to the marketplace. The flow covers setting a price and currency, enforcing pricing constraints, setting metadata (category, language, difficulty), applying a theme (Pro only), and enforcing the free tier 3-quiz publish limit. Themes are baked into the listing at publish time.

## Acceptance criteria

- [ ] Creator can initiate "Save and publish to marketplace" or just "Save" to only save it to their own dashboard from their quiz editor.
- [ ] Creators can also publish a quiz from their dashboard.
- [ ] Creator sets a buy price with currency selection (USD, SEK, EUR); minimum $0.99
- [ ] Creator can optionally set a rental price; minimum $0.50, maximum 80% of buy price — enforced server-side
- [ ] Creator selects category, language, and difficulty for the listing
- [ ] First two questions are automatically used as the inline preview (server strips correct answers for display)
- [ ] Pro creators can apply a custom theme color that is baked into the listing
- [ ] Free users are blocked from publishing if they already have 3 active listings
- [ ] Unpublishing a quiz frees up a slot for free accounts (limit tracks currently active listings only)
- [ ] Republishing a taken-down quiz counts as a new publish and uses a slot
- [ ] When a creator edits a published quiz, a popup prompt appears asking whether they want to apply the changes to the marketplace listing. If they confirm, a new version is created automatically and the marketplace listing updates immediately — no manual republish required. If they decline, the changes are saved locally to their account only and the marketplace listing remains unchanged.
- [ ] Creator must have completed Stripe Connect onboarding before publishing
