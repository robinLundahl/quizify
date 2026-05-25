# TICKET-080 — Settings: Subscription section

**Status:** Open  
**Type:** Feature  
**Priority:** Medium

## Goal

Add a Subscription section to the Settings page where users can see their current plan, manage their Pro subscription, and download receipts for past charges. This is the single place for all subscription-related actions.

## Acceptance criteria

- [ ] Settings page has a dedicated Subscription section
- [ ] Displays current plan (Free or Pro) with billing status (trialing, active, cancelled)
- [ ] Pro users can cancel their subscription from this section
- [ ] Free users see an upgrade prompt linking to the Pro upgrade flow (TICKET-078)
- [ ] Trialing users see the trial end date and a note about when billing begins
- [ ] Past subscription charges are listed with amount, date, and a download link for the receipt
- [ ] Receipts are served from Stripe invoice URLs or stored in Supabase storage
