# TICKET-003: Map Question — Configurable Radius Rings & Point Scoring

**Status:** Done
**Created:** 2026-05-18
**Completed:** 2026-05-18
**Priority:** High

## Description
Extended the MAP question type so creators can define up to 4 radius rings around the correct pin. Each ring has a radius (km) and point value. Scoring evaluates rings smallest-first; 0 points if outside all rings. Rings are rendered as filled circles on the map with a warm-to-faded-red gradient.

## Acceptance Criteria
- [x] Creator can add up to 4 rings to a MAP question, each with radius + points
- [x] Rings are persisted to the database per question
- [x] Scoring evaluates rings smallest-first; 0 points if outside all rings
- [x] After answering, the map renders filled circles for each ring with a warm-to-faded-red gradient
- [x] The player's pin remains visible on the results map
- [x] Distance from correct location is shown (optional — deferred to game session phase)

## Schema changes
- Removed `radiusKm` from `MapQuestion`
- Added `MapRing` model (`mapQuestionId`, `radiusKm`, `points`, `order`)
- Migration: `20260518120944_add_map_rings`

## Files modified
- `server/prisma/schema.prisma` — new MapRing model, removed radiusKm from MapQuestion
- `server/src/routes/quiz.ts` — buildRelations handles rings, GET includes rings
- `client/src/hooks/useQuizzes.ts` — added MapRing type, updated MapQuestionData + QuestionPayload
- `client/src/pages/QuizEditor.tsx` — ring management UI, MapPicker with Circle overlays, MapInitializer fix

## Implementation notes
- Circles rendered largest-first in DOM so smaller ones appear on top (SVG layer order)
- `MapInitializer` uses `useMap()` + `useEffect` to set initial view once on mount — avoids the remount-on-drag bug from TICKET-002
- Ring colors: `rgba(220,38,38, 0.08–0.40)` interpolated by ring position
- Rings sorted by radiusKm ascending before saving to DB
