# TICKET-082 — Account deletion policy enforcement

**Status:** Open  
**Type:** Feature  
**Priority:** Medium

## Goal

Enforce the full account deletion policy for users who have marketplace activity. Deletion is blocked or deferred when money is involved. Published quizzes are unpublished on deletion. Personal data is anonymized immediately but transaction records are retained for 90 days before hard deletion.

## Acceptance criteria

- [ ] If the user has a **pending balance** (funds in the 14-day hold): deletion is blocked with a message showing the exact date they can proceed
- [ ] If the user has an **available balance**: a forced payout is triggered before deletion proceeds; the $10 minimum threshold is waived
- [ ] On confirmed deletion: all creator's published quizzes are immediately unpublished (no new purchases/rentals)
- [ ] Existing buyers and renters retain full access to quizzes they have purchased or are renting
- [ ] Creator's Stripe Connect account is disconnected and deauthorized via the Stripe API
- [ ] **Soft delete**: user's personal data (name, email, avatar, bio) is anonymized immediately; transaction records (`QuizPurchase`, `CreatorPayout`, `QuizRental`, `MarketplaceReview`) are retained
- [ ] A background job performs a **hard delete** of anonymized user records after a 90-day retention period
