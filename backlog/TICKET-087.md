# TICKET-087 — Let buyers edit song name and artist per question

**Status:** Open  
**Type:** Feature  
**Priority:** Medium

## Goal

Buyers of a purchased quiz should be able to set their own Song Name and Artist Name on each question, independently of the creator's values. When a buyer opens their purchased quiz, these fields should be prefilled with the creator's current values if present. Any edits the buyer makes are saved only to their `customSnapshot` and never touch the original quiz or other buyers' copies. If the creator later changes their song metadata and the buyer applies an update, the buyer's manually customized values must not be overwritten.

## Acceptance criteria

- [ ] The purchased quiz view shows editable Song Name and Artist Name fields for each question.
- [ ] Fields are prefilled from the creator's question data if values exist and the buyer has not yet set their own.
- [ ] Saving persists the buyer's values inside `customSnapshot.questions[].songName/artistName` via a dedicated API endpoint.
- [ ] The original quiz's `songName`/`artistName` on the `Question` model is not modified.
- [ ] Other buyers' snapshots are unaffected by one buyer's edits.
- [ ] Buyer-set values survive a creator update: applying an update via the update review modal does not overwrite fields the buyer has explicitly edited.
