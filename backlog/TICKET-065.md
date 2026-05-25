# TICKET-065 — Implement inline question preview

**Status:** Open  
**Type:** Feature  
**Priority:** Medium

## Goal

Show the first two questions of a marketplace quiz inline on the listing page so users can evaluate the content before purchasing. Correct answers are stripped server-side. Questions beyond the first two are blurred/hidden until the user has purchased or is actively renting the quiz.

## Acceptance criteria

- [ ] Public endpoint `GET /api/marketplace/:quizId/preview` returns the first two questions of the quiz
- [ ] Correct answer identifiers are stripped from the payload — never sent to the client
- [ ] Preview is accessible without login
- [ ] Questions 3 and beyond are visually blurred or hidden on the listing page with a "Purchase to unlock" overlay
- [ ] Full quiz content remains gated behind a valid `QuizPurchase` or active `QuizRental` record
