# TICKET-061 — Build marketplace landing page

**Status:** Done  
**Type:** Feature  
**Priority:** Medium

## Goal

Replace the current landing page at `/` with a public marketplace library. This is the first thing anyone sees when visiting the site — logged in or not. It should surface all published quizzes with filtering, sorting, and a free text search field, and give Pro creator quizzes priority placement.

## Acceptance criteria

- [x] `/` renders the marketplace library for all users (guest and logged-in)
- [x] All published marketplace quizzes are listed
- [x] Free text search field for searching quiz topic, title, and description
- [x] Filterable by:
  - Category (fixed enum — 31 values matching `AI_CATEGORIES` in `QuizEditor.tsx`)
  - Language (fixed list — 7 values matching `AI_LANGUAGES` in `QuizEditor.tsx`)
  - Difficulty (Easy, Medium, Hard)
  - Question count (range spans: 1–10, 11–20, 21–30, 31–40, 41–50, 51–60, 61–70, 71–80, 81–90, 91–100)
  - Price range
  - Rating
- [x] Currency display toggle: USD, SEK, EUR — affects all price displays on the page
- [x] Pro creator quizzes appear with priority placement (higher `listingScore`)
- [ ] ~~Logged-in users see subtle personalisation~~ — deferred
- [x] Share button present on each quiz card in the listing
