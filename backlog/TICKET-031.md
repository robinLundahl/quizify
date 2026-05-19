# TICKET-031: Fix white bars on iPhone in player game view

**Status:** Open  
**Created:** 2026-05-19  
**Priority:** Medium  

## Description
On iPhone, the top and bottom of the player game screen (JoinView) show white bars instead of the page background colour. The background colour does not extend behind the notch area or the home indicator bar.

## Root causes
Two separate issues combine to cause this:

1. **Missing `viewport-fit=cover`** — without this, Mobile Safari reserves the notch and home-indicator areas and fills them with the `<body>` background colour (white by default). Adding `viewport-fit=cover` to the viewport meta tag lets the page extend into those areas.

2. **`min-h-screen` = `100vh` on Mobile Safari** — `100vh` on iOS Safari is computed against the *maximum* viewport height (browser chrome hidden), so when the address bar is visible the content is taller than the actual visible area, or vice versa. Replace with `min-h-dvh` (`100dvh` — dynamic viewport height) which tracks the currently visible area correctly.

## Acceptance Criteria
- [ ] `index.html` viewport meta tag updated to include `viewport-fit=cover`
- [ ] All six full-screen phase wrappers in `JoinView.tsx` (enter, lobby, finished, reveal, answered, question) change `min-h-screen` to `min-h-dvh`
- [ ] Safe-area padding added to the top and bottom of JoinView phase wrappers so content (buttons, text) is never obscured by the notch or home indicator — use Tailwind arbitrary values `pt-[env(safe-area-inset-top)]` and `pb-[env(safe-area-inset-bottom)]`
- [ ] White bars are gone on iPhone in both the indigo (`bg-indigo-600`) and dark (`bg-gray-900`) phases
- [ ] Layout is unchanged on desktop browsers

## Files to change
- `client/index.html` — add `viewport-fit=cover` to the `<meta name="viewport">` tag
- `client/src/pages/JoinView.tsx` — replace `min-h-screen` with `min-h-dvh` and add safe-area padding on all six phase wrapper divs

## Notes
- HostView is shown on a laptop or TV screen and is not affected; only JoinView needs this fix
- `min-h-dvh` is available in Tailwind v4 out of the box
- The safe-area insets are `0` on desktop, so adding `pt-[env(safe-area-inset-top)]` and `pb-[env(safe-area-inset-bottom)]` has no visible effect outside iPhone
- The question phase wrapper (`flex min-h-dvh flex-col bg-gray-900`) does not use `justify-center` and needs the bottom padding most — the submit button sits near the bottom of the screen
