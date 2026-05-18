# TICKET-004: Phase 4 — Real-time Game Sessions

**Status:** Open
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

## Scoring logic
- **MULTIPLE_CHOICE / IMAGE / TRUE_FALSE**: exact match on the correct `AnswerOption`
- **OPEN_ENDED**: no automatic scoring (award full points, or skip — mark for review later)
- **MAP**: Haversine distance vs. each ring smallest-first; points from tightest ring hit, 0 if outside all rings (logic from TICKET-003)

## REST endpoints needed
- `POST /api/sessions` — create a session (returns `code`)
- `GET /api/sessions/:code` — get session info (for join page)

## Client views

### Host view (`/host/:sessionId`)
- Lobby: shows join code prominently + live list of players as they join
- In-game: current question text, live answer count, "Next question" button
- Post-question: correct answer reveal + leaderboard
- End: final leaderboard, option to play again

### Player view (`/join`)
- Enter code → enter nickname → waiting lobby
- In-game: answer interface per question type (buttons for MC/TF, text for open-ended, map pin for MAP)
- Post-question: personal score + rank
- End: final leaderboard

### Shared leaderboard component
- Ranked list of players with scores
- Animate score changes between questions

## Acceptance Criteria
- [ ] Host can create a session from the dashboard and get a join code
- [ ] Players can join via code + nickname from any device/browser
- [ ] Questions are broadcast in order with a countdown timer
- [ ] All 5 question types are answerable by players
- [ ] MAP answers are scored using the ring logic from TICKET-003
- [ ] Leaderboard updates after every question
- [ ] Game ends gracefully with a final leaderboard
- [ ] Late joins are rejected after the game has started

## Notes
- Socket.io room per session: use `sessionId` as the room name
- `server/src/socket/gameHandlers.ts` exists but is empty — put all event logic there
- Short join code: 6 random uppercase letters/digits (already modelled as `code @unique` on `GameSession`)
- Player view must work well on mobile (players typically use phones)
- Timer should be server-authoritative (`endsAt` timestamp) to prevent client clock drift cheating
