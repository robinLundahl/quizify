# TICKET-067 — Implement purchase flow

**Status:** Open  
**Type:** Feature  
**Priority:** Medium

## Goal

Allow users to purchase a marketplace quiz using Stripe. The platform takes a 12% application fee and the remaining 88% is held for 14 days before being transferred to the creator's connected Stripe account. A `QuizPurchase` record is created on successful payment, granting the buyer permanent access at the current quiz version.

## Acceptance criteria

- [ ] "Buy" button on quiz listing initiates a Stripe PaymentIntent with 12% `application_fee_amount`
- [ ] Guest users are redirected to login and returned to the listing after authenticating
- [ ] On successful payment, a `QuizPurchase` record is created with `versionAtPurchase` set to the listing's current version
- [ ] Purchased quiz is immediately accessible to the buyer
- [ ] Creator funds are held and not transferred until the 14-day refund window closes
- [ ] Attempting to purchase an already-owned quiz is blocked gracefully
- [ ] All quiz content endpoints verify a valid `QuizPurchase` record before serving content
