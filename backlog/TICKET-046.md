# TICKET-046: Optional Timer per Question

**Status:** Open
**Created:** 2026-05-21
**Priority:** Medium

## Description

Add a per-question "Use timer" toggle in the quiz editor. When the toggle is on (the default), the question works exactly as today — the countdown runs, auto-expires, and response speed factors into the final score. When toggled off, the question has no countdown: the host decides when to advance, and points are awarded at full value regardless of how long players took to answer.

The existing minimum time limit of 5 seconds stays in place. The toggle is independent of the time-limit field — it simply enables or disables the timed behaviour for that question.

## Acceptance Criteria

- [ ] `useTimer` boolean field (default `true`) added to the `Question` model in `schema.prisma`
- [ ] Migration generated and applied
- [ ] QuizEditor shows a "Use timer" checkbox per question; when unchecked the time-limit input is hidden
- [ ] When `useTimer = false`:
  - No auto-timeout during the game — host manually ends the question via a Stop button. Then goes on to the next question with a "Next question"-button.
  - No time multiplier in score calculation — all correct answers receive full points
  - Timer UI hidden on both HostView and JoinView
- [ ] When `useTimer = true`: existing behaviour is fully preserved (5–120 s countdown, time-based point bonus)

## Files Likely Affected

- `server/prisma/schema.prisma` — add `useTimer Boolean @default(true)` to `Question`
- `server/src/routes/quiz.ts` — include `useTimer` in create and update handlers
- `server/src/socket/gameHandlers.ts` — skip `setTimeout` and time multiplier when `!useTimer`; include `useTimer` in broadcast payload
- `client/src/hooks/useQuizzes.ts` — add `useTimer` to `Question` interface and `QuestionPayload`
- `client/src/pages/QuizEditor.tsx` — "Use timer" checkbox; conditionally render time-limit input
- `client/src/pages/HostView.tsx` — hide countdown widget when `!question.useTimer`
- `client/src/pages/JoinView.tsx` — hide countdown when `!question.useTimer`

## Notes

- `scoreAnswer()` in `gameHandlers.ts` currently computes `timeFraction = 1 - responseTimeMs / (question.timeLimit * 1000)` — when `useTimer === false`, skip this and use a flat multiplier of `1.0`.
- The auto-timeout `setTimeout` in `broadcastQuestion()` must be skipped entirely when `!useTimer` (no fallback timer).
- The `host:next` handler already ends the current question before advancing — it becomes the only end trigger for untimed questions, with no code changes needed there.
- `useTimer` must be included in the socket broadcast so client views can react correctly.
