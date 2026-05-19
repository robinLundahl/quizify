# TICKET-025: Add image upload option to Ranking question type

**Status:** Done
**Created:** 2026-05-19
**Priority:** Medium

## Description
When creating or editing a RANKING (or OPEN_ENDED) question, the host should be able to attach an image either by uploading from their device or pasting a URL.

## Acceptance Criteria

- [x] A RANKING question in the quiz editor has an optional image field (upload button + URL input)
- [x] An OPEN_ENDED question also has the image field
- [x] If an image is provided, it is saved and returned with the question data
- [x] The image is displayed to players during the question phase (already handled by existing imageUrl rendering in JoinView/HostView)
- [x] If no image is provided, the question behaves exactly as before (no regression)

## Done
Added `POST /quiz/upload-image` endpoint using multer + Supabase `question-images` bucket. Replaced the plain URL input in `QuizEditor.tsx` with an upload button + URL fallback combo, applied to IMAGE, RANKING, and OPEN_ENDED question types. The `formToPayload` function now includes `imageUrl` for RANKING and OPEN_ENDED types.
