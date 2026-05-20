# TICKET-040: Edit Display Name in Settings

**Status:** Done
**Created:** 2026-05-20
**Closed:** 2026-05-20
**Priority:** Medium

## Description

The host currently has no way to change the display name shown in the app. Settings should include an editable name field so the host can update their name at any time.

## Acceptance Criteria

- [x] Settings page has an editable display name field pre-filled with the current name
- [x] Saving updates the name in the database and reflects immediately in the UI
- [x] Empty or whitespace-only names are rejected with a validation message
- [x] No regression on other settings (theme, etc.)

## Notes

Added `PATCH /api/auth/me` in `server/src/routes/auth.ts` — validates non-empty name, updates DB, returns updated user shape. On the client (`client/src/pages/Settings.tsx`), the static name display is replaced with an inline text input. Save/Cancel buttons appear only when the value differs from the stored name; Enter key also triggers save. A brief "Saved" confirmation shows on success. Errors surface inline below the input.
