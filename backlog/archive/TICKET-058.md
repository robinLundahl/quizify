# TICKET-058 — Rename app from Quizify to QuizCraft

**Status:** Done  
**Type:** Feature  
**Priority:** Medium

## Goal

The product name is changing from "Quizify" to "QuizCraft". All visible references to the old name need to be updated — including the browser tab title, the navbar logo/text, and any other user-facing strings. Internal package names and URLs do not need to change.

## Acceptance criteria

- [x] Navbar displays "QuizCraft" instead of "Quizify"
- [x] Browser tab title shows "QuizCraft"
- [x] No remaining user-facing instances of "Quizify" in the UI

## Resolution

Updated 7 locations: `client/index.html` (tab title), navbar text in `Dashboard.tsx`, `Settings.tsx`, and `AdminPanel.tsx`, join page heading in `JoinView.tsx`, and login/register subtitle strings in `en.json` and `sv.json`. Internal localStorage keys (`quizify_*`) left unchanged.
