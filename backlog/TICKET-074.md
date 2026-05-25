# TICKET-074 — Implement rental purchase flow

**Status:** Open  
**Type:** Feature  
**Priority:** Medium

## Goal

Allow users to rent a quiz for 48 hours. The quiz listing page should show both a "Rent" and "Buy" option when the creator has set a rental price. The rental flow mirrors the purchase flow but grants time-limited access and creates a `QuizRental` record instead of a `QuizPurchase`.

## Acceptance criteria

- [ ] Quiz listing page shows a "Rent for 48h" button when `rentalPrice` is set on the listing
- [ ] Rental initiates a Stripe PaymentIntent with 10% `application_fee_amount`
- [ ] On successful payment, a `QuizRental` record is created with `expiresAt = now + 48h`
- [ ] Rented quiz is accessible to the user for 48 hours
- [ ] Content access endpoints check both `QuizPurchase` and active `QuizRental` records
- [ ] Guest users are redirected to login with deferred return, same as the buy flow
- [ ] Users who already own the quiz cannot rent it — show "You own this" instead
