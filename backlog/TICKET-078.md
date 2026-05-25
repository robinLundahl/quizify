# TICKET-078 — Pro subscription payment flow

**Status:** Open  
**Type:** Feature  
**Priority:** High

## Goal

Implement self-serve Pro subscription upgrades using Stripe Billing. Currently the only way to grant Pro status is via manual admin assignment. This ticket adds a proper payment flow with a free trial, automatic renewal, and cancellation support.

## Acceptance criteria

- [ ] User can initiate a Pro upgrade from the Subscription section in Settings
- [ ] Upgrade flow uses Stripe Checkout or Billing with a 7-day free trial
- [ ] Trial starts immediately — no payment required to begin, but a valid payment method must be collected at trial start
- [ ] User is not charged if they cancel before the trial ends
- [ ] After trial, $2.00/month billing starts automatically and renews monthly until cancelled
- [ ] On successful subscription activation, user's `plan` is set to PRO and `subscriptionStatus` updated
- [ ] User can cancel their subscription from the Subscription section in Settings
- [ ] On cancellation: Pro access continues until the end of the current billing period, then reverts to Free
- [ ] Stripe webhook handles: `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- [ ] `stripeCustomerId` and `stripeSubscriptionId` are stored on the user record
