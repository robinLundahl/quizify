# TICKET-079 — Settings: Profile tab

**Status:** Open  
**Type:** Feature  
**Priority:** Medium

## Goal

Add a Profile tab to the Settings page. Name and avatar editing currently live in the main settings view — these should move into the Profile tab. A new bio field should also be added here, which is displayed on the creator's public profile page.

## Acceptance criteria

- [ ] Settings page has a "Profile" tab
- [ ] Name editing is moved from the main settings view into the Profile tab
- [ ] Avatar upload, crop, and removal is moved from the main settings view into the Profile tab
- [ ] Bio field added: short free-text, displayed on the public creator profile page (`/creator/:id`)
- [ ] Bio is saved via `PATCH /api/auth/me` (or a new dedicated endpoint) and stored on the User model
- [ ] Bio is optional — empty bio shows nothing on the public profile
