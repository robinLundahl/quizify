# TICKET-037: Dark / Light Theme Toggle

**Status:** Done
**Created:** 2026-05-20
**Closed:** 2026-05-20
**Priority:** Medium

## Description

Add a dropdown in the Dashboard header that lets the user switch between a **Light** and **Dark** colour theme. The selected theme should persist across page reloads (via `localStorage`) and apply to all non-game pages: Dashboard, Settings, QuizEditor, Login, and Register. Game-mode screens (`/host`, `/join`) are already full-screen dark or brand-colour and are excluded.

## Acceptance Criteria

- [x] A "Light / Dark" dropdown appears in the Dashboard header (between the Quizify logo and the user avatar)
- [x] Selecting **Dark** switches all affected pages to dark surfaces (`bg-gray-900` page, `bg-gray-800` cards) with appropriate text and border colours
- [x] Selecting **Light** reverts all pages to the existing light appearance
- [x] Theme choice persists on page reload (stored in `localStorage` under key `theme`)
- [x] No flash-of-wrong-theme on initial load
- [x] Game screens (`/host`, `/join`) are unaffected
- [x] TypeScript type-check passes (`npx tsc --noEmit` from `client/`)

## Notes

Implemented in commit 4f5fe01. Zustand themeStore + Tailwind v4 `@custom-variant dark` + `dark:` variants across all affected pages and components. design.md updated with dark mode surface mapping table.
