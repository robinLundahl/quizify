# TICKET-069 — Redesign dashboard with four tabs

**Status:** Shipped  
**Type:** Feature  
**Priority:** Medium

## Goal

Redesign the user dashboard to support four tabs: My Quizzes, Purchased, Rentals, and Earnings. Published quizzes show a version badge. The Purchased tab surfaces version update prompts. The Rentals tab differentiates active and expired rentals visually.

## Acceptance criteria

- [ ] Dashboard has four tabs: "My Quizzes", "Purchased", "Rentals", "Earnings"
- [ ] "My Quizzes" shows all quizzes created by the user — drafts and published together
- [ ] A user should be able to host a quiz regardless if their own quizzes are published to the marketplace or not.
- [ ] Published quizzes display a version badge (e.g. "v3") that increments only when the creator confirms they want to push changes to the marketplace. Edits saved locally to the creator's account without publishing do not increment the version badge.
- [ ] Draft quizzes show no badge
- [ ] "Purchased" tab shows quizzes bought from other creators, with creator name and purchase date
- [ ] Purchased quiz shows an update badge when a newer version is available (links to notification)
- [ ] "Rentals" tab shows rented quizzes; active rentals display normally with time remaining; expired rentals are greyed out with expiry date shown
- [ ] "Earnings" tab — covered by TICKET-068
- [ ] Tabs are clearly visible and easy to switch between
