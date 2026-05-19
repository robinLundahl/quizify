# TICKET-023: Display ranking answers in human-readable format in results view

**Status:** Done
**Created:** 2026-05-19
**Priority:** Medium

## Description
When viewing the results of a game session, ranking question answers were displayed as raw JSON (e.g. `["id1","id2","id3"]`) instead of showing the actual item labels in order.

## Acceptance Criteria

- [x] In the results view, ranking answers are displayed as an ordered list of item labels (e.g. "1. Paris, 2. London, 3. Berlin") rather than raw JSON
- [x] The correct order is also shown alongside each player's answer so the host can compare
- [x] If the JSON cannot be parsed (malformed answer), fall back gracefully (e.g. show "Invalid answer")

## Done
Fixed in `server/src/routes/sessions.ts`: added `rankingItems` to the questions include, parse each player's JSON answer array and resolve IDs to labels, and set `correctAnswerText` to the ranked list of item labels in correct order.
