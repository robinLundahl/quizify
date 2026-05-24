# TICKET-056 — Return AI-matched image with AI-generated image questions

**Status:** Open  
**Type:** Feature  
**Priority:** Medium

## Goal

When a pro user generates a quiz with the AI quiz generator and selects the image question type, the AI response should include a suggested image that fits the generated question. Currently the AI generates the question text but does not surface a relevant image alongside it, leaving the user to find and attach one manually. The image should be selected or suggested automatically based on the question content so the quiz is ready to use with minimal extra effort.

## Acceptance criteria

- [ ] AI-generated image questions include a suggested image URL or asset in the API response
- [ ] The quiz editor pre-fills the image field with the suggested image when creating from AI generation
- [ ] The suggested image is visually relevant to the question topic
- [ ] Feature is gated to pro users only
- [ ] Fallback is graceful if no suitable image is found (field left empty, no error)
