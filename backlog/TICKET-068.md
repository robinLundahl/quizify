# TICKET-068 — Implement creator earnings and payout system

**Status:** Open  
**Type:** Feature  
**Priority:** Medium

## Goal

Give all users (free and Pro) an Earnings tab in their dashboard to view their balance and payout history, and allow creators to withdraw earnings on demand. Funds are held for 14 days after each sale before becoming available. Payouts are processed via Stripe Connect transfers.

## Acceptance criteria

- [ ] Earnings tab is visible in the dashboard for **all users** — not gated behind Pro
- [ ] Displays current available balance (funds past the 14-day hold)
- [ ] Displays pending balance (still in hold period), with release date shown
- [ ] Displays total earned (all time)
- [ ] Payout history lists past payouts with amount, date, and a downloadable receipt per payout
- [ ] "Withdraw" button enabled when available balance is $10 or more; blocked with a clear message below $10
- [ ] Requesting a payout triggers a Stripe transfer to the creator's connected account
- [ ] `CreatorPayout` record is created with status, amount, currency, stripeTransferId, and releasesAt
- [ ] On account deletion: the $10 minimum threshold is waived and a forced payout is triggered before deletion proceeds
