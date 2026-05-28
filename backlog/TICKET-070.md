# TICKET-070 — Implement verified buyer review system

**Status:** Open  
**Type:** Feature  
**Priority:** Medium

## Goal

Allow buyers to leave a star rating and optional written review on a purchased quiz. Only verified buyers can review — enforced structurally via a `purchaseId` foreign key, not just a business logic check. One review per purchase.

## Acceptance criteria

- [ ] Buyers can submit a rating (1–5 stars) and optional write a review after a finished session
- [ ] Review submission is blocked unless a valid `QuizPurchase` or `QuizRental` record exists for that user + quiz
- [ ] Unique constraint on `purchaseId` in `MarketplaceReview` prevents duplicate reviews at the DB level
- [ ] Reviews are displayed on the quiz listing page with star rating, review body, and reviewer name
- [ ] Aggregate average rating is calculated and displayed on the listing
- [ ] Non-buyers see reviews but cannot submit one
