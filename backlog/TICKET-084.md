# TICKET-084 — Move quiz metadata fields out of AI-generate section

**Status:** Open  
**Type:** Feature  
**Priority:** Medium

## Goal

Quiz topic, category, difficulty, and language are currently only shown inside the AI-generate container. These fields should be moved to the top-level quiz creation area alongside title and description, as they describe the quiz itself rather than the AI generation job. When the user enables AI generation, only the fields specific to that job — number of questions and "with image" toggle — should appear inside the AI section, along with the "Generate questions" button.

## Acceptance criteria

- [ ] Quiz topic, category, difficulty, and language fields appear in the main quiz creation form alongside title and description
- [ ] The AI-generate section only contains: questions (count), "With Image" toggle, and the "Generate questions" button
- [ ] If the user does not enable AI generation, the AI-specific fields are not shown
- [ ] AI generation reads quiz topic, category, difficulty, and language from the shared form fields (not duplicated inputs)
- [ ] Existing AI generation behaviour is unchanged — the same values are sent to the generate endpoint
