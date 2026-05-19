# TICKET-013: Avatar management in Settings

**Status:** Done  
**Created:** 2026-05-19  
**Priority:** Low  

## Description
Let logged-in users upload, replace, or remove their avatar photo from the Settings page. The avatar is currently a URL string on the User model, set automatically from Google OAuth. This ticket adds a manual upload/remove flow on top of that.

## Storage
Use **Supabase Storage**. Create a public bucket called `avatars`. Uploaded files are stored as `<userId>/<timestamp>.<ext>` and the resulting public URL is saved to `User.avatar`.

Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `server/.env` (and `.env.example`). Use the `@supabase/supabase-js` client on the server to interact with storage.

## Server changes

**`PATCH /api/auth/avatar`** — requires auth, accepts `multipart/form-data` with a single `avatar` file field.
- Validate: image files only (jpeg, png, webp, gif); max 2 MB.
- Upload to Supabase Storage bucket `avatars` at path `<userId>/<timestamp>.<ext>`.
- If the user already has a custom avatar stored in the `avatars` bucket, delete the old file before uploading the new one.
- Update `User.avatar` with the new public URL.
- Return `{ avatar: <url> }`.

**`DELETE /api/auth/avatar`** — requires auth.
- Delete the file from Supabase Storage (if it exists in the `avatars` bucket).
- Set `User.avatar` to `null`.
- Return `{ ok: true }`.

Use `multer` (already installed) with `memoryStorage` to receive the file, then pass the buffer to the Supabase Storage client.

## Client changes

**Settings page (`client/src/pages/Settings.tsx`):**
- Show the current avatar (same rendering logic as `NavDropdown`: image if set, initial-letter fallback if not), sized larger (e.g. `h-16 w-16`).
- An **Upload photo** button opens a hidden `<input type="file" accept="image/*">`.
- On file selection, POST via `PATCH /api/auth/avatar` (multipart), update the avatar in the auth store on success, show a loading state on the button.
- If an avatar is currently set, show a **Remove photo** link/button that calls `DELETE /api/auth/avatar` and clears the avatar in the auth store.
- Show an inline error message on failure.

## Acceptance Criteria
- [ ] `PATCH /api/auth/avatar` uploads the file to Supabase Storage and updates `User.avatar`
- [ ] `DELETE /api/auth/avatar` removes the file from storage and sets `User.avatar` to null
- [ ] Old avatar file is deleted from storage when a new one is uploaded
- [ ] File type and size are validated server-side (images only, max 2 MB)
- [ ] Settings page shows current avatar with upload and remove controls
- [ ] Auth store is updated immediately after upload/remove so NavDropdown reflects the change without a page reload
- [ ] Loading and error states are handled in the UI

## Notes
- Google avatar URLs (from OAuth) are external URLs, not stored in the `avatars` bucket. The delete route should only attempt to remove a file from storage if the URL matches the Supabase Storage domain — otherwise just null out the field.
- No schema migration needed — `avatar String?` already exists.
