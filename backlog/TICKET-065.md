# TICKET-065 — Implement demo mode

**Status:** Open  
**Type:** Feature  
**Priority:** Medium

## Goal

Allow any user (including guests) to play a short demo of a marketplace quiz before purchasing. The demo serves 1–2 questions in real quiz mode without revealing correct answers. All logic must be enforced server-side.

## Acceptance criteria

- [ ] Public endpoint `GET /api/marketplace/:quizId/demo` returns only the designated demo questions
- [ ] Correct answer identifiers are stripped from demo question payloads
- [ ] Answers are validated server-side — the endpoint returns correct/incorrect, never the answer itself
- [ ] Demo is accessible without login
- [ ] Full quiz content remains gated behind a `QuizPurchase` record
