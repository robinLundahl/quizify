# TICKET-075 — Rental expiry worker and discount offer generation

**Status:** Open  
**Type:** Feature  
**Priority:** Medium

## Goal

When a rental expires, automatically send the user an email notification and generate a 20% discount offer valid for 24 hours. The offer is created server-side by a background worker that checks for expired rentals. After 24 hours, the offer is no longer valid and the user pays the standard price.

## Acceptance criteria

- [ ] Background job runs periodically and detects rentals where `expiresAt` has passed and no offer has been generated yet
- [ ] On expiry: a `DiscountOffer` record is created with `discountPct = 20` and `validUntil = expiresAt + 24h`
- [ ] On expiry: user receives an email notifying them the rental ended, including the 20% discount offer and its expiry time
- [ ] After `validUntil` passes, the offer is no longer surfaced in the UI or redeemable
- [ ] The worker is idempotent — processing the same expired rental twice does not create duplicate offers or send duplicate emails
