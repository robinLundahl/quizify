# TICKET-061 — Build marketplace landing page

**Status:** Open  
**Type:** Feature  
**Priority:** Medium

## Goal

Replace the current landing page at `/` with a public marketplace library. This is the first thing anyone sees when visiting the site — logged in or not. It should surface all published quizzes with filtering and sorting options, and give Pro creator quizzes priority placement.

## Acceptance criteria

- [ ] `/` renders the marketplace library for all users (guest and logged-in)
- [ ] All published marketplace quizzes are listed
- [ ] Filterable by: category, language, difficulty, price range, rating, number of questions, estimated playtime
- [ ] Pro creator quizzes appear with priority placement (higher `listingScore`)
- [ ] Logged-in users see subtle personalisation (e.g. highlights based on purchased categories)
- [ ] Share button present on each quiz card in the listing
