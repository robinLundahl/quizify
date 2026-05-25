# TICKET-062 — Build quiz listing page

**Status:** Open  
**Type:** Feature  
**Priority:** Medium

## Goal

Build the individual quiz listing page at `/quiz/:id`. This is the public-facing page where users evaluate a quiz before purchasing. It shows full metadata, ratings, reviews, a demo, and the purchase action.

## Acceptance criteria

- [ ] Page renders at `/quiz/:id` and is publicly accessible without login
- [ ] Displays full metadata: title, description, category, difficulty, number of questions, estimated playtime, color theme, price
- [ ] Displays aggregate rating and individual reviews from verified buyers
- [ ] Share button copies a direct link to the listing
- [ ] "Play demo" button launches a 1–2 question demo in real quiz mode (answers not revealed)
- [ ] "Buy" button initiates purchase flow — redirects guests to login with deferred return
- [ ] Links to the creator's public profile
