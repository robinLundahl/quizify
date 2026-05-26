# TICKET-085 — Add landing page sections: categories, trending, most bought, most rented

**Status:** Open  
**Type:** Feature  
**Priority:** Medium

## Goal

The landing page needs four discovery sections to drive marketplace engagement.
The **Our Categories** section shows all quiz categories; clicking one opens the
marketplace with that category pre-selected. The **Trending Quizzes** section
surfaces the top 10 quizzes by a weighted engagement score (purchase=5,
rental=3, view=1) over the last 30 days, recalculated daily; quizzes newer
than 7 days are excluded to ensure rankings reflect genuine engagement. The
**Most Bought** and **Most Rented** sections each show the top 10 quizzes by
their respective action count over the last 30 days, also recalculated daily.
All quiz cards display social proof in plain language rather than raw scores.

## Acceptance criteria

- [ ] Our Categories section renders all available categories and navigates to marketplace with category filter pre-filled on click
- [ ] Trending Quizzes shows ≤10 quizzes scored by (purchases×5 + rentals×3 + views×1) over last 30 days, excluding quizzes <7 days old, with score recalculated daily
- [ ] Most Bought shows ≤10 quizzes ranked by purchase count over last 30 days, recalculated daily
- [ ] Most Rented shows ≤10 quizzes ranked by rental count over last 30 days, recalculated daily
- [ ] Each quiz card in trending/bought/rented sections shows human-readable social proof copy (e.g. "47 people took this quiz this month")
- [ ] Scores are stored/cached server-side and not recalculated per request
