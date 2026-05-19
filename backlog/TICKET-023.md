# TICKET-023: Display ranking answers in human-readable format in results view

**Status:** Open
**Created:** 2026-05-19
**Priority:** Medium

## Description
When viewing the results of a game session, ranking question answers are displayed as raw JSON (e.g. `["id1","id2","id3"]`) instead of showing the actual item labels in order. The host should see a clear, readable list of how each player ordered the items.

## Acceptance Criteria

- [ ] In the results view, ranking answers are displayed as an ordered list of item labels (e.g. "1. Paris, 2. London, 3. Berlin") rather than raw JSON
- [ ] The correct order is also shown alongside each player's answer so the host can compare
- [ ] If the JSON cannot be parsed (malformed answer), fall back gracefully (e.g. show "Invalid answer")

## Notes
- Ranking answers are stored in `GameAnswer.answer` as a JSON array of `RankingItem` IDs (e.g. `["cuid1","cuid2","cuid3"]`)
- The results view is in `client/src/pages/ResultsView.tsx`
- To resolve IDs to labels, the results API response needs to include ranking item data — check whether `GET /api/results/:sessionId` already returns `rankingItems` on each question
- The fix is likely client-side only: parse the JSON array, look up each ID in the question's `rankingItems`, and render the labels in order
