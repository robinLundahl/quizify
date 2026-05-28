# TICKET-070 — Implement verified buyer review system

**Status:** Done  
**Type:** Feature  
**Priority:** Medium

## Goal

Allow buyers to leave a star rating and optional written review on a purchased quiz. Only verified buyers can review — enforced structurally via a `purchaseId` foreign key, not just a business logic check. One review per purchase.

## Acceptance criteria

- [x] Buyers can submit a rating (1–5 stars) and optional write a review after a finished session
- [x] Review submission is blocked unless a valid `QuizPurchase` or `QuizRental` record exists for that user + quiz
- [x] Unique constraint on `purchaseId` in `MarketplaceReview` prevents duplicate reviews at the DB level
- [x] Reviews are displayed on the quiz listing page with star rating, review body, and reviewer name
- [x] Aggregate average rating is calculated and displayed on the listing
- [x] Non-buyers see reviews but cannot submit one

## Resolution

Implemented ReviewModal component shared between HostView and ResultsView. Review prompt fires once when navigating to Dashboard after a finished session. POST /marketplace/:id/review enforces a completed GameSession exists before accepting a review. reviewPromptSeen flag on QuizPurchase tracks the one-time modal. Covered by Playwright e2e suite.
