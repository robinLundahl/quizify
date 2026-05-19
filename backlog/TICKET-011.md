# TICKET-011: User dropdown with Settings page and account deletion

**Status:** Done  
**Created:** 2026-05-19  
**Priority:** Medium  

## Description
Replace the static name/avatar display in the top-right nav with a clickable dropdown menu. Add a Settings page accessible from that dropdown. Inside Settings, allow the user to permanently delete their account.

## Acceptance Criteria
- [ ] Clicking the avatar or name in the nav opens a dropdown with **Settings** and **Log out** items
- [ ] Dropdown dismisses on outside click
- [ ] Dropdown is extracted into a reusable `NavDropdown` component used across all protected page headers
- [ ] `/settings` route exists (protected) showing the user's name and email read-only
- [ ] Settings page has a "Danger zone" section with a **Delete account** button
- [ ] Pressing Delete account shows an inline confirmation ("Are you sure? This cannot be undone.") with Cancel and Confirm Delete
- [ ] `DELETE /api/auth/account` deletes the User row (cascading all owned data), clears the cookie, returns `{ ok: true }`
- [ ] On confirmed deletion: auth state cleared, redirected to `/login`

## Notes
- No schema changes needed — existing `onDelete: Cascade` relations cover cleanup
- Email/name editing is out of scope (separate ticket)
- Avatar upload is out of scope
- No external modal library — use inline confirmation pattern
