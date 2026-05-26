# TICKET-059 — Add marketplace database schema

**Status:** Done  
**Type:** Feature  
**Priority:** High

## Goal

Add all database tables required by the pay-per-quiz marketplace, including the rental model. All other marketplace features depend on this schema being in place first. Tables cover quiz listings, purchases, rentals, creator payouts, buyer reviews, discount offers, notifications, and listing reports.

## Acceptance criteria

- [x] `MarketplaceListing` table exists with fields: quizId, creatorId, price, currency (USD/SEK/EUR), rentalPrice (nullable), status, listingScore, versionAtPublish
- [x] `QuizPurchase` table exists with fields: buyerId, listingId, purchaseDate, amountPaid, versionAtPurchase
- [x] `QuizRental` table exists with fields: userId, listingId, rentedAt, expiresAt, amountPaid
- [x] `CreatorPayout` table exists with fields: creatorId, amount, currency, status, stripeTransferId, releasesAt, receiptUrl (nullable)
- [x] `MarketplaceReview` table exists with fields: purchaseId (FK), rating (1–5), body, createdAt
- [x] `DiscountOffer` table exists with fields: userId, listingId, discountPct, validUntil, redeemedAt (nullable)
- [x] `Notification` table exists with fields: userId, type (enum), payload (JSON), readAt (nullable), createdAt
- [x] `ListingReport` table exists with fields: listingId, reportedByUserId (nullable — guests can report), reason, createdAt, resolvedAt (nullable)
- [x] User model gains: bio (String, nullable), stripeAccountId (nullable), stripeCustomerId (nullable), stripeSubscriptionId (nullable), subscriptionStatus (enum: FREE/TRIALING/ACTIVE/CANCELLED), trialEndsAt (nullable)
- [x] Unique constraint on `purchaseId` in `MarketplaceReview` (one review per purchase)
- [x] Prisma migration applied and client regenerated

## Notes

Implemented in migration `20260526085951_add_marketplace_schema`. Also added enums: `SubscriptionStatus`, `Currency`, `ListingStatus`, `PayoutStatus`, `NotificationType`. Database was reset to resolve prior schema drift before applying.
