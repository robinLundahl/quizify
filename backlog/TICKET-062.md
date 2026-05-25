# TICKET-062 — Build quiz listing page

**Status:** Open  
**Type:** Feature  
**Priority:** Medium

## Goal

Build the individual quiz listing page at `/quiz/:id`. This is the public-facing page where users evaluate a quiz before purchasing. It shows full metadata, ratings, reviews, an inline question preview, and the purchase/rent actions.

## Acceptance criteria

- [ ] Page renders at `/quiz/:id` and is publicly accessible without login
- [ ] Displays full metadata: title, description, category, difficulty, number of questions, color theme, price (in selected currency)
- [ ] Displays aggregate rating and individual reviews from verified buyers
- [ ] Share button copies a direct link to the listing
- [ ] First two questions are shown inline without correct answers (server strips answers) — remaining questions are blurred/hidden until purchase
- [ ] "Buy" button initiates purchase flow — redirects guests to login with deferred return
- [ ] "Rent for 48h" button shown when creator has set a rental price — same deferred auth for guests
- [ ] If user already owns the quiz, show "You own this" instead of buy/rent buttons
- [ ] If user has an active rental, show time remaining instead of rent button
- [ ] Links to the creator's public profile
- [ ] Report/flag button visible to all users (logged-in and guest)
