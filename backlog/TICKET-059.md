# TICKET-059 — Add marketplace database schema

**Status:** Open  
**Type:** Feature  
**Priority:** High

## Goal

Add the core database tables required by the pay-per-quiz marketplace. All other marketplace features depend on this schema being in place first. Tables cover quiz listings, purchases, creator payouts, and buyer reviews.

## Acceptance criteria

- [ ] `MarketplaceListing` table exists with fields: quizId, creatorId, price, status, listingScore
- [ ] `QuizPurchase` table exists with fields: buyerId, listingId, purchaseDate, amountPaid
- [ ] `CreatorPayout` table exists with fields: creatorId, amount, status, stripeTransferId, releasesAt
- [ ] `MarketplaceReview` table exists with fields: purchaseId (FK), rating (1–5), body, createdAt
- [ ] Unique constraint on `purchaseId` in `MarketplaceReview` (one review per purchase)
- [ ] Prisma migration applied and client regenerated
