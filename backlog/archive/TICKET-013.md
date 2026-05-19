# TICKET-013: Avatar management in Settings

**Status:** Done  
**Created:** 2026-05-19  
**Priority:** Low  

## Acceptance Criteria
- [x] `PATCH /api/auth/avatar` uploads the file to Supabase Storage and updates `User.avatar`
- [x] `DELETE /api/auth/avatar` removes the file from storage and sets `User.avatar` to null
- [x] Old avatar file is deleted from storage when a new one is uploaded
- [x] File type and size are validated server-side (images only, max 2 MB)
- [x] Settings page shows current avatar with upload and remove controls
- [x] Auth store is updated immediately after upload/remove so NavDropdown reflects the change without a page reload
- [x] Loading and error states are handled in the UI

## Done
Shipped in commit d11d664. Also fixed a bug where Google OAuth unconditionally overwrote a custom uploaded avatar on every login — now preserved if it's a Supabase Storage URL. Node 20 WebSocket issue resolved by installing `ws` and passing it as the Supabase realtime transport.
