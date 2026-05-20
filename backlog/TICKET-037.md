# TICKET-037: Dark / Light Theme Toggle

**Status:** Open
**Created:** 2026-05-20
**Priority:** Medium

## Description

Add a dropdown in the Dashboard header that lets the user switch between a **Light** and **Dark** colour theme. The selected theme should persist across page reloads (via `localStorage`) and apply to all non-game pages: Dashboard, Settings, QuizEditor, Login, and Register. Game-mode screens (`/host`, `/join`) are already full-screen dark or brand-colour and are excluded.

## Acceptance Criteria

- [ ] A "Light / Dark" dropdown appears in the Dashboard header (between the Quizify logo and the user avatar)
- [ ] Selecting **Dark** switches all affected pages to dark surfaces (`bg-gray-900` page, `bg-gray-800` cards) with appropriate text and border colours
- [ ] Selecting **Light** reverts all pages to the existing light appearance
- [ ] Theme choice persists on page reload (stored in `localStorage` under key `theme`)
- [ ] No flash-of-wrong-theme on initial load
- [ ] Game screens (`/host`, `/join`) are unaffected
- [ ] TypeScript type-check passes (`npx tsc --noEmit` from `client/`)

## Implementation Notes

- Use a Zustand store (`themeStore.ts`) to hold `'light' | 'dark'`; initialise from `localStorage`
- Toggle `class="dark"` on `document.documentElement` in `main.tsx` by subscribing to the store
- Enable Tailwind v4 class-based dark mode via `@custom-variant dark (&:where(.dark, .dark *));` in `index.css`
- Add `dark:` Tailwind variants to: Dashboard, Settings, Login, Register, QuizEditor, NavDropdown, ProtectedRoute
- Dark surface mapping: `bg-gray-50` → `dark:bg-gray-900`, `bg-white` → `dark:bg-gray-800`, borders `dark:border-gray-700`, headings `dark:text-gray-100`, body `dark:text-gray-300`
- Brand colour (`indigo-600/700`) and semantic colours stay unchanged in both modes
- Document dark mode tokens in `design.md`

## Notes

Start with Light / Dark only. More theme options (e.g. System) can be added in a follow-up ticket.
