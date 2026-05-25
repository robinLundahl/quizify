# TICKET-068 — Implement creator payout system

**Status:** Open  
**Type:** Feature  
**Priority:** Medium

## Goal

Allow creators to withdraw their earnings on demand once their balance reaches a $10 minimum. Funds are held for 14 days after each sale before becoming available. Payouts are processed via Stripe Connect transfers to the creator's connected account.

## Acceptance criteria

- [ ] Creator dashboard shows available balance (funds past the 14-day hold) and pending balance (still in hold period)
- [ ] Creator can request a payout when available balance is $10 or more
- [ ] Requesting a payout below $10 is blocked with a clear message
- [ ] Payout triggers a Stripe transfer to the creator's connected account
- [ ] `CreatorPayout` record is created with status, amount, stripeTransferId, and releasesAt
- [ ] Payout history is visible in the dashboard
