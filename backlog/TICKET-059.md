# TICKET-059 — Add marketplace database schema

**Status:** Open  
**Type:** Feature  
**Priority:** High

## Goal

Add all database tables required by the pay-per-quiz marketplace, including the rental model. All other marketplace features depend on this schema being in place first. Tables cover quiz listings, purchases, rentals, creator payouts, buyer reviews, and discount offers. Merged with TICKET-073.

## Acceptance criteria

- [ ] `MarketplaceListing` table exists with fields: quizId, creatorId, price, rentalPrice (nullable), status, listingScore
- [ ] `QuizPurchase` table exists with fields: buyerId, listingId, purchaseDate, amountPaid
- [ ] `QuizRental` table exists with fields: userId, listingId, rentedAt, expiresAt, amountPaid
- [ ] `CreatorPayout` table exists with fields: creatorId, amount, status, stripeTransferId, releasesAt
- [ ] `MarketplaceReview` table exists with fields: purchaseId (FK), rating (1–5), body, createdAt
- [ ] `DiscountOffer` table exists with fields: userId, listingId, discountPct, validUntil, redeemedAt (nullable)
- [ ] Unique constraint on `purchaseId` in `MarketplaceReview` (one review per purchase)
- [ ] Prisma migration applied and client regenerated
