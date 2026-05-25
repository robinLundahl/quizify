# TICKET-063 — Build creator profile page

**Status:** Open  
**Type:** Feature  
**Priority:** Medium

## Goal

Build the public creator profile page at `/creator/:id`. Anyone can visit this page without logging in. It shows the creator's published quizzes and aggregate stats, and is designed to be shareable for discoverability.

## Acceptance criteria

- [ ] Page renders at `/creator/:id` and is publicly accessible without login
- [ ] Displays creator name, avatar, and bio (bio is set in the creator's Profile tab in Settings)
- [ ] Lists all of the creator's published marketplace quizzes
- [ ] Shows aggregate stats: total quizzes published, average rating, member since date
- [ ] Does not expose drafts, purchased quizzes, earnings, or any private data
