# TICKET-066 — Stripe Connect onboarding for creators

**Status:** Open  
**Type:** Feature  
**Priority:** Medium

## Goal

Allow creators to connect a Stripe account so they can receive payouts from quiz sales. Uses Stripe Connect Express, which handles KYC, tax forms, and currency conversion. Creators must complete onboarding before their quiz can be published to the marketplace. The platform takes a 12% application fee on all transactions.

## Acceptance criteria

- [ ] Creator can initiate Stripe Connect Express onboarding from their dashboard
- [ ] After completing onboarding, their `stripeAccountId` is stored on their user record
- [ ] Creators without a connected Stripe account cannot publish to the marketplace
- [ ] Onboarding status is visible in the dashboard (connected / not connected)
- [ ] Stripe account connection can be managed (view, disconnect) from the dashboard
