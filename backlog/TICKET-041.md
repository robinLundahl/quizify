# TICKET-041: Language Switcher (English / Swedish)

**Status:** Open
**Created:** 2026-05-20
**Priority:** Medium

## Description

All UI text on both the host and player sides is currently hardcoded in English. Add a language switcher so both the host and players can toggle between English (EN) and Swedish (SV) independently.

- **Host** — a compact EN / SV toggle in the Dashboard navbar (persistent via `localStorage` so it survives page refreshes).
- **Player** — a similar EN / SV toggle visible in the player views (join, lobby, question, feedback, leaderboard, results). Player preference stored in `localStorage` as well.

## Scope

All user-facing strings on both the host side and player side must be translated. This includes but is not limited to:

**Host views:** Dashboard, Settings, Quiz editor, Host lobby, Host question view, leaderboard/results.

**Player views:** Join page, nickname entry, waiting lobby, question view, answer feedback, leaderboard, final results.

## Proposed Approach

1. **i18n library** — use `i18next` + `react-i18next`. Define two JSON resource bundles: `en.json` and `sv.json` under `client/src/locales/`.
2. **Host toggle** — add a small `EN | SV` switch to the Dashboard navbar (next to the existing nav items). Clicking it calls `i18n.changeLanguage()` and persists the choice to `localStorage`.
3. **Player toggle** — add the same toggle in a fixed corner of the player-facing layout so it's accessible on every player screen.
4. **Language init** — on load, read `localStorage` language key; fall back to browser `navigator.language`; default to `en` if neither matches.
5. **No server changes needed** — language is a client-only concern.

## Acceptance Criteria

- [ ] `i18next` + `react-i18next` installed and configured
- [ ] All host-side UI strings translated to both EN and SV
- [ ] All player-side UI strings translated to both EN and SV
- [ ] Host EN/SV toggle appears in the Dashboard navbar and persists across refreshes
- [ ] Player EN/SV toggle appears in all player-facing views and persists across refreshes
- [ ] Switching language updates all visible text immediately without a page reload
- [ ] Default language falls back to browser locale, then EN

## Files Likely Affected

- `client/src/locales/en.json` — new English string bundle
- `client/src/locales/sv.json` — new Swedish string bundle
- `client/src/i18n.ts` — i18next initialisation
- `client/src/main.tsx` — import i18n init before rendering
- `client/src/components/ui/NavDropdown.tsx` — host language toggle
- `client/src/pages/Dashboard.tsx` — navbar area
- All host and player page components — replace hardcoded strings with `t('key')`

## Notes

Keep translation keys descriptive and namespaced by feature (e.g. `dashboard.createQuiz`, `player.waitingForHost`) to avoid collisions as the app grows.
