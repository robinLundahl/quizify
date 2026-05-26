# TICKET-062 — Build quiz listing page

**Status:** Done  
**Type:** Feature  
**Priority:** Medium

## Goal

Build the individual quiz listing page at `/marketplace/:id` (public-facing). Shows full metadata, ratings, reviews, an inline question preview, and the purchase/rent actions.

## Acceptance criteria

- [x] Page renders at `/marketplace/:id` and is publicly accessible without login
- [x] Displays full metadata: title, description, category, difficulty, number of questions, price (in selected currency)
- [x] Displays aggregate rating and individual reviews from verified buyers
- [x] Share button copies a direct link to the listing
- [x] First two questions shown inline without correct answers — remaining questions blurred/locked
- [x] "Buy" button initiates purchase flow — redirects guests to login with deferred return
- [x] "Rent for 48h" button shown when creator has set a rental price — same deferred auth for guests
- [x] If user already owns the quiz, show "You own this" instead of buy/rent buttons
- [x] If user has an active rental, show time remaining instead of rent button
- [x] Links to the creator's public profile (page built in TICKET-063)
- [x] Report/flag button visible to all users — placeholder, wired in TICKET-081
