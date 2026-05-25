# TICKET-077 — Discount offer redemption flow

**Status:** Open  
**Type:** Feature  
**Priority:** Medium

## Goal

Allow users to redeem a post-rental discount offer to purchase a quiz at 20% off. The offer can be applied from the notifications inbox or from the quiz listing page. Once redeemed or expired, the offer cannot be used again.

## Acceptance criteria

- [ ] Quiz listing page shows the 20% discount offer and discounted price if the user has an active `DiscountOffer` for that quiz
- [ ] User can redeem the offer from both the notification card and the quiz listing page
- [ ] Redemption initiates a Stripe PaymentIntent at the discounted price (platform still takes 12% of the discounted amount)
- [ ] On successful payment, `DiscountOffer.redeemedAt` is set and a `QuizPurchase` record is created
- [ ] Expired offers (`validUntil` passed) cannot be redeemed — standard price is shown instead
- [ ] Already-redeemed offers cannot be applied again
