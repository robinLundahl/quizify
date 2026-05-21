# TICKET-046: Optional Timer per Question

**Status:** Done
**Created:** 2026-05-21
**Priority:** Medium

## Description

Add a per-question "Use timer" toggle in the quiz editor. When on (default), the question works exactly as before — countdown runs, auto-expires, and response speed factors into points. When off, the host manually stops the question with a full-width Stop button; points are awarded at full value regardless of response time.

## Acceptance Criteria

- [x] `useTimer` boolean field (default `true`) added to the `Question` model in `schema.prisma`
- [x] Migration generated and applied
- [x] QuizEditor shows a "Use timer" checkbox per question; when unchecked the time-limit input is hidden
- [x] When `useTimer = false`:
  - No auto-timeout during the game — host manually ends the question via a Stop button. Then goes on to the next question with a "Next question"-button.
  - No time multiplier in score calculation — all correct answers receive full points
  - Timer UI hidden on both HostView and JoinView
- [x] When `useTimer = true`: existing behaviour is fully preserved (5–120 s countdown, time-based point bonus)

## Notes

Implemented with a `host:stop_question` socket event that calls `endQuestion` without advancing. Stop button is a full-width indigo button at the bottom of the question view, matching the "Next Question" button style. JoinView shows "No timer" label in place of the countdown.
