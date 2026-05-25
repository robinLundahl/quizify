# TICKET-081 — Report/flag mechanism for marketplace listings

**Status:** Open  
**Type:** Feature  
**Priority:** Medium

## Goal

Allow any user (logged-in or guest) to flag a marketplace quiz listing for review. Flagged listings are queued in the admin panel for investigation. Admins can review reports and take down listings that violate platform policies.

## Acceptance criteria

- [ ] Report button is visible on each quiz listing page (accessible to all users including guests)
- [ ] Clicking report opens a short form with a reason field
- [ ] Submission creates a `ListingReport` record with listingId, reportedByUserId (nullable for guests), reason, and createdAt
- [ ] Admin panel shows a "Reports" queue listing all unresolved flags
- [ ] Admin can mark a report as resolved and optionally take down the listing
- [ ] Taking down a listing sets its status to `REMOVED` and removes it from the public library
- [ ] Creator is notified (via notification inbox) if their listing is taken down
