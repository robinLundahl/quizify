# TICKET-073 — Add rental model to database schema

**Status:** Open  
**Type:** Feature  
**Priority:** High

## Goal

Extend the marketplace schema to support quiz rentals and post-expiry discount offers. A rental grants time-limited access (48 hours) rather than permanent ownership. Discount offers are generated server-side on expiry and are valid for 24 hours.

## Acceptance criteria

- [ ] `QuizRental` table exists with fields: userId, listingId, rentedAt, expiresAt, amountPaid
- [ ] `DiscountOffer` table exists with fields: userId, listingId, discountPct, validUntil, redeemedAt (nullable)
- [ ] `rentalPrice` field added to `MarketplaceListing` (nullable — not all quizzes need to offer rental)
- [ ] Prisma migration applied and client regenerated
