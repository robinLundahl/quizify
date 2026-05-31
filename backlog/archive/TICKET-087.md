# TICKET-087 — Let buyers edit song name and artist per question

**Status:** Done  
**Type:** Feature  
**Priority:** Medium

## Goal

Buyers of a purchased quiz should be able to set their own Song Name and Artist Name on each question, independently of the creator's values. When a buyer opens their purchased quiz, these fields should be prefilled with the creator's current values if present. Any edits the buyer makes are saved only to their `customSnapshot` and never touch the original quiz or other buyers' copies. If the creator later changes their song metadata and the buyer applies an update, the buyer's manually customized values must not be overwritten.

## Acceptance criteria

- [x] The purchased quiz view shows editable Song Name and Artist Name fields for each question.
- [x] Fields are prefilled from the creator's question data if values exist and the buyer has not yet set their own.
- [x] Saving persists the buyer's values inside `customSnapshot.songOverrides` via `PATCH /marketplace/:id/song-metadata`.
- [x] The original quiz's `songName`/`artistName` on the `Question` model is not modified.
- [x] Other buyers' snapshots are unaffected by one buyer's edits.
- [x] Buyer-set values survive a creator update: `claim-update` preserves `songOverrides` when merging, and the overrides are re-applied on top of merged questions before serving.

## Resolution

Added `songOverrides` field to `CustomSnapshot` (stored in `QuizPurchase.customSnapshot`). New `PATCH /marketplace/:id/song-metadata` endpoint writes overrides without touching the source quiz. `GET /:id/quiz` applies overrides when serving to buyers. `QuizPreview` renders inline Song Name / Artist inputs per question when opened from the Purchased tab, with a Save button that activates on dirty state.
