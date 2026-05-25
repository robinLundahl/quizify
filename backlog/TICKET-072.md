# TICKET-072 — Implement priority placement and listing score

**Status:** Open  
**Type:** Feature  
**Priority:** Low

## Goal

Implement a listing score algorithm that determines the order quizzes appear in the marketplace library. Pro creator quizzes receive a priority boost. The score is stored as a materialized value and recalculated on relevant events to keep library queries fast.

## Acceptance criteria

- [ ] `listingScore` is stored on `MarketplaceListing` and updated on: new purchase, new rating, creator subscription change
- [ ] Score formula accounts for: average rating, purchase count, Pro creator boost, and recency
- [ ] Pro creator quizzes appear higher in library listings than equivalent free creator quizzes
- [ ] Library query sorts by `listingScore` descending
- [ ] Score recalculation does not block the user-facing request that triggers it (async/background)
