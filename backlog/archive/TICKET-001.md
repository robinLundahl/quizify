# TICKET-001: Phase 3 — Quiz CRUD

**Status:** Done
**Created:** 2026-05-18
**Completed:** 2026-05-18
**Priority:** High

## Description
Auth and the database schema are complete. The next phase is building the full quiz management flow — both the API layer and the frontend UI — so a logged-in user can create, edit, and delete quizzes and their questions.

This covers all question types already modelled in the schema: Multiple Choice, True/False, Open-Ended, Image, and Map.

## Scope

### Server — API endpoints (mount under `/api/quiz`)
- `GET    /api/quiz`           — list quizzes owned by the authenticated user
- `POST   /api/quiz`           — create a new quiz
- `GET    /api/quiz/:id`       — get a single quiz with all questions
- `PUT    /api/quiz/:id`       — update quiz metadata (title, description)
- `DELETE /api/quiz/:id`       — delete a quiz (cascade questions)
- `POST   /api/quiz/:id/questions`         — add a question
- `PUT    /api/quiz/:id/questions/:qid`    — update a question
- `DELETE /api/quiz/:id/questions/:qid`   — delete a question

All routes protected by `requireAuth` middleware.

### Client — pages & components
- **Dashboard** — list user's quizzes with create button
- **Quiz editor** (`/quiz/:id`) — title/description editor + question list
- **Question editor** — inline add/edit per type:
  - Multiple choice: up to 4 options, radio to mark correct
  - True/False: radio toggle
  - Open-ended: prompt only
  - Image: URL input + preview + options
  - Map: lat/lng/radius inputs

## Acceptance Criteria
- [x] Authenticated user can create a quiz via the UI
- [x] User can add questions of all 5 types to a quiz
- [x] Questions and answer options are persisted to the database
- [x] User can edit and delete questions
- [x] User can delete a quiz (removes all associated questions)
- [x] Unauthenticated requests to `/api/quiz` return 401
- [x] Dashboard lists only the current user's quizzes

## Files created/modified
- `server/src/routes/quiz.ts` — new
- `server/src/index.ts` — mount quiz router
- `client/src/hooks/useQuizzes.ts` — new
- `client/src/pages/Dashboard.tsx` — updated with quiz list
- `client/src/pages/QuizEditor.tsx` — new
- `client/src/App.tsx` — added `/quiz/:id` route
