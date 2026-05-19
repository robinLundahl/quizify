# TICKET-014: Avatar crop and zoom before upload

**Status:** Done  
**Created:** 2026-05-19  
**Priority:** Low  

## Description
After selecting an image file, show an inline crop editor that lets the user zoom and pan the image to choose exactly how it sits inside the circular avatar. Only the cropped result is uploaded — the original file is never sent to the server.

## Library
Use **`react-easy-crop`** (`npm install react-easy-crop`). It provides a circular crop area out of the box with zoom and pan, and outputs pixel crop coordinates that can be used to generate a cropped canvas blob.

## Flow
1. User clicks **Upload photo** → file picker opens (unchanged)
2. User selects an image → instead of uploading immediately, open an **inline crop panel** below the current avatar
3. Crop panel shows:
   - The image with a circular crop overlay (using `react-easy-crop` with `cropShape="round"`)
   - A zoom slider (`<input type="range">`) below the crop area
   - **Save** (primary button) and **Cancel** (ghost button) actions
4. User adjusts zoom and pan, then clicks **Save**:
   - Use the `croppedAreaPixels` from `react-easy-crop` to draw the cropped region onto an offscreen `<canvas>`
   - Export the canvas as a JPEG blob (quality 0.9)
   - Upload the blob via `PATCH /api/auth/avatar` (same as before)
   - Close the crop panel and update the avatar in the auth store
5. **Cancel** dismisses the crop panel and discards the selected file

## Client changes
- Install `react-easy-crop` in `client/`
- Create a `AvatarCropper` component (`client/src/components/ui/AvatarCropper.tsx`) that encapsulates the crop/zoom UI
- Extract `getCroppedBlob` helper to `client/src/lib/cropImage.ts` (separated to satisfy react-refresh ESLint rule)
- Update `Settings.tsx` to show `AvatarCropper` inline (replacing the current immediate-upload behaviour on file selection)

## Acceptance Criteria
- [x] Selecting a file opens the crop panel instead of uploading immediately
- [x] Crop panel has a circular overlay, zoom slider, Save and Cancel buttons
- [x] Pan works by dragging the image inside the crop area
- [x] Zoom slider controls zoom level (min 1×, max 3×)
- [x] Save crops the image to the circle and uploads the result as JPEG
- [x] Cancel discards the selection with no upload
- [x] Loading state shown on Save button during upload
- [x] Error message shown if upload fails
- [x] No server changes needed

## Done
Shipped in commit 229780f. `getCroppedBlob` helper lives in `client/src/lib/cropImage.ts` (split from the component file to satisfy the `react-refresh/only-export-components` ESLint rule). Object URLs are revoked after use to avoid memory leaks.
