# TICKET-063 — Build creator profile page

**Status:** Done  
**Type:** Feature  
**Priority:** Medium

## Goal

Build the public creator profile page at `/creator/:id`. Anyone can visit this page without logging in. It shows the creator's published quizzes and aggregate stats, and is designed to be shareable for discoverability.

## Acceptance criteria

- [x] Page renders at `/creator/:id` and is publicly accessible without login
- [x] Displays creator name, avatar, and bio (bio is set in the creator's Profile tab in Settings)
- [x] Lists all of the creator's published marketplace quizzes
- [x] Shows aggregate stats: total quizzes published, average rating, member since date
- [x] Does not expose drafts, purchased quizzes, earnings, or any private data

## Done

Shipped in commit 748005a. Added `GET /marketplace/creator/:id` server endpoint and `client/src/pages/CreatorProfile.tsx` page with avatar, bio, stats, and listing grid.
