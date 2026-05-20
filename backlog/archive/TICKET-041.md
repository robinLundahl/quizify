# TICKET-041: Language Switcher (English / Swedish)

**Status:** Done
**Created:** 2026-05-20
**Completed:** 2026-05-20
**Priority:** Medium

## Description

All UI text on both the host and player sides is currently hardcoded in English. Add a language switcher so both the host and players can toggle between English (EN) and Swedish (SV) independently.

- **Host** — a compact EN / SV toggle in the Dashboard navbar (persistent via `localStorage` so it survives page refreshes).
- **Player** — a similar EN / SV toggle visible in the player views (join, lobby, question, feedback, leaderboard, results). Player preference stored in `localStorage` as well.

## Acceptance Criteria

- [x] `i18next` + `react-i18next` installed and configured
- [x] All host-side UI strings translated to both EN and SV
- [x] All player-side UI strings translated to both EN and SV
- [x] Host EN/SV toggle appears in the NavDropdown (Dashboard, Settings, QuizEditor) and in HostView's fixed corner
- [x] Player EN/SV toggle appears in all player-facing views (all JoinView phases) and persists across refreshes
- [x] Switching language updates all visible text immediately without a page reload
- [x] Default language falls back to browser locale, then EN
- [x] LangToggle moved to centre of question header pill to avoid overlapping the countdown timer

## Notes

Language persists to `localStorage` key `quizify_lang`. `i18next-browser-languagedetector` handles detection order: localStorage → navigator → fallback `en`. True/False answer options stored as English strings in DB are translated client-side at render time. LangToggle in the question phase is embedded in the header bar (between question counter and timer) rather than a fixed overlay.
