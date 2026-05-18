# TICKET-007: Post-game results persistence

**Status:** Done
**Created:** 2026-05-18
**Priority:** High

## Description
Game results currently live only in server memory — once the Socket.io session ends, all scores and answers are lost. The database already has `GameSession`, `Participant`, and `GameAnswer` tables, but they are not fully populated during a live game. This ticket wires up persistence so hosts can review results after a game ends and players can see their history.

## Acceptance Criteria
- [ ] `Participant` rows are created/updated with final `score` when a player joins and as points are awarded
- [ ] `GameAnswer` rows are written for every answer submitted (questionId, participantId, answer value, pointsEarned, responseTimeMs)
- [ ] `GameSession.status` is updated to `FINISHED` when the game ends
- [ ] A `GET /api/sessions/:id/results` endpoint returns the final leaderboard and per-question answer breakdown
- [ ] The host sees a "View Results" link/button on the finished screen that opens the results page
- [ ] Results page (`/results/:sessionId`) shows: final leaderboard, each question with how many players answered correctly, and individual player answer details

## Notes
- All DB writes should happen server-side in `gameHandlers.ts` — no client changes needed for persistence itself
- The results page is a new protected route (host only, or anyone with the session ID)
- `GameAnswer.answer` is currently a `String` in the schema — may need to review if that handles all question types (map answers are lat/lng, could be stored as JSON string)
