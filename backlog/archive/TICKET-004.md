# TICKET-004: Phase 4 — Real-time Game Sessions

**Status:** Done
**Created:** 2026-05-18
**Priority:** High

## Description
The real-time multiplayer game flow — the core Kahoot-style experience. A host picks a quiz, creates a session, and gets a short join code. Players join from any device using that code. The host starts the game and questions are broadcast one by one via Socket.io. Players submit answers within the time limit, the server scores them, and results + a running leaderboard are shown after each question. A final leaderboard closes the game.

All database models are already in place (`GameSession`, `Participant`, `GameAnswer`). This phase is purely the Socket.io event wiring and the game UI.

## Socket.io events

### Host → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `host:create` | `{ quizId }` | Create a new session, returns `{ code, sessionId }` |
| `host:start` | `{ sessionId }` | Start the game, server begins question loop |
| `host:next` | `{ sessionId }` | Advance to the next question |

### Player → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `player:join` | `{ code, nickname }` | Join a session lobby, returns `{ sessionId, participantId }` |
| `player:answer` | `{ sessionId, participantId, questionId, answer }` | Submit an answer (`answer` is option ID, `"true"`/`"false"`, free text, or `"lat,lng"` for MAP) |

### Server → Client (broadcast)
| Event | Payload | Description |
|-------|---------|-------------|
| `session:player_joined` | `{ nickname, count }` | New player joined the lobby |
| `session:started` | — | Game is starting |
| `session:question` | `{ question, index, total, endsAt }` | Next question (no correct answer included) |
| `session:question_ended` | `{ correctAnswer, scores }` | Time up — reveal answer + leaderboard snapshot |
| `session:finished` | `{ leaderboard }` | Final leaderboard |

## Acceptance Criteria
- [x] Host can create a session from the dashboard and get a join code
- [x] Players can join via code + nickname from any device/browser
- [x] Questions are broadcast in order with a countdown timer
- [x] All 5 question types are answerable by players
- [x] MAP answers are scored using the ring logic from TICKET-003
- [x] Leaderboard updates after every question
- [x] Game ends gracefully with a final leaderboard
- [x] Late joins are rejected after the game has started

## Notes
- Verified end-to-end with Playwright across two browser tabs
- `server/src/routes/sessions.ts` — REST endpoints
- `server/src/socket/gameHandlers.ts` — all Socket.io event logic
- `client/src/pages/HostView.tsx` and `client/src/pages/JoinView.tsx`
- Vite proxy updated to forward `/socket.io` WebSocket connections
