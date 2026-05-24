# TICKET-054 — AI Quiz Generation

**Status:** Done  
**Type:** Feature  
**Priority:** High

## Problem

Users build quizzes by adding questions manually one at a time, which is slow. There is no shortcut to bootstrap a quiz with questions about a given topic.

## Goal

Add an AI generation panel inside the quiz editor's title/description card. The user fills in a topic, category, language, difficulty, question count, and whether to include images — then clicks "Generera frågor". The server calls the Claude API and bulk-creates MULTIPLE_CHOICE questions in the quiz, which then appear in the question list. The feature is PRO-only, with a hard limit of **20 generations per user per calendar month**.

---

## UI — `client/src/pages/QuizEditor.tsx`

### `QuizMetaForm` (lines 1026–1071)

Add an "AI-generera" toggle button in the footer row alongside the existing Save button. When clicked, a panel expands below the title/description fields (inside the same `<section>`) using a CSS height transition. The panel contains:

| Label          | Type       | Options                                                                                                                                                                                                                                                                                                                                                                     |
| -------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QUIZÄMNE       | Text input | Free text, placeholder "Ange ett ämne för att generera quiz"                                                                                                                                                                                                                                                                                                                |
| KATEGORI       | Select     | Historia, Vetenskap, Sport, Geografi, Film & TV, Musik, Mat & Dryck, Teknik, Litteratur, Allmänkunskap, Matematik, Fysik, Kemi, Sociala studier, Språk, Konst & litteratur, AI, Säkerhet, Kommunikation, Design, Ekonomi, Bank & försäkring, Marknadsföring & sälj, Juridik, Jordbruk, Nutrition & dietetik, Resa & turism, Kultur % tradition, Dans, Teater, Underhållning |
| SPRÅK          | Select     | Svenska, Engelska, Norska, Danska, Tyska, Franska, Spanska                                                                                                                                                                                                                                                                                                                  |
| SVÅRIGHETSGRAD | Select     | Lätt, Medel,Svår                                                                                                                                                                                                                                                                                                                                                            |
| FRÅGOR         | Select     | 5, 10, 15, 20 (default: 10)                                                                                                                                                                                                                                                                                                                                                 |
| MED BILD       | Select     | Utan bild, Med bild                                                                                                                                                                                                                                                                                                                                                         |

A "Generera frågor" submit button sits at the bottom of the panel. While generating, show a loading state and disable the button. On success, the question list auto-refreshes via React Query cache invalidation.

If the user's plan is FREE, the "AI-generera" toggle is disabled with a tooltip indicating PRO is required. If the user's plan is PRO but they have used all 20 monthly generations, the submit button is disabled and a quota-exhausted message is shown instead.

### New i18n keys (both `sv.json` and `en.json` under `quiz_editor`)

```
ai_generate_button         "AI-generera"                              / "AI Generate"
ai_panel_topic             "Quizämne"                                 / "Quiz topic"
ai_panel_topic_placeholder "Ange ett ämne för att generera quiz"     / "Enter a topic to generate a quiz"
ai_panel_category          "Kategori"                                 / "Category"
ai_panel_language          "Språk"                                    / "Language"
ai_panel_difficulty        "Svårighetsgrad"                           / "Difficulty"
ai_panel_count             "Frågor"                                   / "Questions"
ai_panel_with_image        "Med bild"                                 / "With image"
ai_generate_submit         "Generera frågor"                          / "Generate questions"
ai_generating              "Genererar…"                               / "Generating…"
ai_pro_only                "Kräver PRO-plan"                          / "Requires PRO plan"
ai_quota_exhausted         "Du har använt alla 20 genereringar för den här månaden"  / "You've used all 20 generations for this month"
ai_quota_remaining         "{{n}} / 20 genereringar kvar denna månad" / "{{n}} / 20 generations remaining this month"
```

---

## Client Hook — `client/src/hooks/useQuizzes.ts`

Add after `useAddQuestion`:

```ts
export interface GenerateQuestionsPayload {
  topic: string;
  category: string;
  language: string;
  difficulty: "easy" | "medium" | "hard";
  count: number;
  withImage: boolean;
}

export function useGenerateQuestions(quizId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: GenerateQuestionsPayload) => {
      const { data } = await api.post<Question[]>(
        `/quiz/${quizId}/generate`,
        body,
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quiz", quizId] }),
  });
}
```

---

## Server Route — `server/src/routes/quiz.ts`

Add `POST /api/quiz/:id/generate` (with `requireAuth`, already applied to the router):

1. Verify quiz belongs to `req.userId`
2. Load user — check `plan === 'PRO'`, return 403 if not
3. Check quota: if `aiGenerationsUsedThisMonth >= 20`, return 429 with a clear message
4. Build a structured prompt for Claude (see below)
5. Call `@anthropic-ai/sdk` using `claude-sonnet-4-6`, request JSON-only output
6. Parse the response and validate shape (`text` + 4 `answerOptions` with exactly 1 correct)
7. Bulk-create questions via `prisma.question.create` + `prisma.answerOption.createMany`, following the existing `buildRelations` pattern (lines 242–286 in quiz.ts)
8. Increment `aiGenerationsUsedThisMonth` on the User row
9. Return the created `Question[]`

If Claude returns malformed JSON or wrong shape, return 502. Do not partially save and do not increment the quota counter on failure.

### Claude prompt

```
System:
You are a quiz question generator. Respond with valid JSON only — an array of objects, no markdown, no explanation.

User:
Generate {count} multiple-choice quiz questions about "{topic}".
Category: {category}. Language: {language}. Difficulty: {difficulty}.
Each object must follow this schema:
{
  "text": "question text",
  "answerOptions": [
    { "text": "option", "isCorrect": true },
    { "text": "option", "isCorrect": false },
    { "text": "option", "isCorrect": false },
    { "text": "option", "isCorrect": false }
  ]
}
Exactly 4 answer options per question, exactly 1 correct. Return a JSON array of {count} objects.
```

---

## Schema — `server/prisma/schema.prisma`

Add two fields to the `User` model:

```prisma
aiGenerationsUsedThisMonth Int      @default(0)
aiGenerationsResetAt       DateTime @default(now())
```

`aiGenerationsResetAt` records when the counter was last reset. On each generation request, if the current date is in a different calendar month than `aiGenerationsResetAt`, reset the counter to 0 and update `aiGenerationsResetAt` before checking the quota. This avoids needing a cron job.

Run `npm run db:migrate` then `npm run db:generate` after the schema change.

---

## Environment

Add to `server/.env` and root `.env.example`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Add `@anthropic-ai/sdk` to `server/package.json` dependencies.

---

## Files to create

| File                          | Purpose                                                  |
| ----------------------------- | -------------------------------------------------------- |
| `server/src/lib/anthropic.ts` | Anthropic client singleton (mirrors `prisma.ts` pattern) |

## Files to modify

| File                              | Change                                                               |
| --------------------------------- | -------------------------------------------------------------------- |
| `client/src/pages/QuizEditor.tsx` | Add AI panel + toggle to `QuizMetaForm`, wire `useGenerateQuestions` |
| `client/src/hooks/useQuizzes.ts`  | Add `GenerateQuestionsPayload` type + `useGenerateQuestions` hook    |
| `client/src/locales/sv.json`      | Add `ai_*` keys under `quiz_editor`                                  |
| `client/src/locales/en.json`      | Add `ai_*` keys under `quiz_editor`                                  |
| `server/prisma/schema.prisma`     | Add `aiGenerationsUsedThisMonth` + `aiGenerationsResetAt` to `User`  |
| `server/src/routes/quiz.ts`       | Add `POST /:id/generate` route                                       |
| `server/.env` + `.env.example`    | Add `ANTHROPIC_API_KEY`                                              |
| `server/package.json`             | Add `@anthropic-ai/sdk`                                              |

---

## Acceptance criteria

- [x] FREE user sees the AI button disabled with a "Kräver PRO-plan" tooltip
- [x] PRO user can expand the AI panel by clicking "AI-generera"
- [x] All 6 fields are present and functional (topic, category, language, difficulty, count, with image)
- [x] Remaining quota (e.g. "18 / 20 genereringar kvar") is shown inside the panel
- [x] Clicking "Generera frågor" shows a loading state
- [x] After generation, the correct number of MULTIPLE_CHOICE questions appears in the question list
- [x] Each generated question has exactly 4 answer options with exactly 1 marked correct
- [x] Quota counter increments after each successful generation
- [x] At 20 generations used, the submit button is disabled and the exhausted message is shown
- [x] Quota resets automatically at the start of a new calendar month
- [x] A 502 is returned (not a partial save) if Claude output is malformed; quota is not incremented
- [x] A 429 is returned if the quota is exhausted

## Implementation notes

Shipped in commit 812e24a. `withImage: true` generates IMAGE type questions (same answerOptions structure, imageUrl: null — author adds images manually). Quota refresh is driven by invalidating the `['me']` React Query cache after each successful generation. Server auto-resets the monthly counter on first request of a new calendar month.

## Verification

1. `npm run dev` from project root
2. Log in as a PRO user → open any quiz in the editor
3. Click "AI-generera" — panel expands with all 6 fields and shows "20 / 20 genereringar kvar"
4. Fill in: topic "Andra världskriget", Kategori "Historia", Språk "Svenska", Svårighetsgrad "Medel", Frågor "5"
5. Click "Generera frågor" — loading spinner appears
6. After ~5–10 s, 5 questions appear in the question list; counter drops to "19 / 20 kvar"
7. Inspect one question: confirm 4 answer options, 1 marked correct, type is MULTIPLE_CHOICE
8. In Prisma Studio, manually set `aiGenerationsUsedThisMonth = 20` → reload editor → confirm submit is disabled and exhausted message is shown
9. Set `aiGenerationsResetAt` to last month in Prisma Studio → reload → confirm counter resets to 20
10. Log in as a FREE user → confirm AI button is disabled with tooltip
