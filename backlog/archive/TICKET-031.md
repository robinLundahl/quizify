# TICKET-031: Fix white bars on iPhone in player game view

**Status:** Done  
**Created:** 2026-05-19  
**Priority:** Medium  

## Description
On iPhone, the top and bottom of the player game screen (JoinView) show white bars instead of the page background colour. The background colour does not extend behind the notch area or the home indicator bar.

## Root causes
Two separate issues combine to cause this:

1. **Missing `viewport-fit=cover`** — without this, Mobile Safari reserves the notch and home-indicator areas and fills them with the `<body>` background colour (white by default).

2. **`min-h-screen` = `100vh` on Mobile Safari** — `100vh` on iOS Safari is computed against the maximum viewport height. Replace with `min-h-dvh` (`100dvh`) which tracks the currently visible area correctly.

3. **No background on `html`/`body`/`#root`** — with `viewport-fit=cover`, Safari paints safe areas with the body background (white). Fixed by adding `min-height: 100dvh` and `background-color: #111827` to `html, body` in `index.css`, and by dynamically syncing `document.body.style.backgroundColor` to the current phase color in JoinView.

## Acceptance Criteria
- [x] `index.html` viewport meta tag updated to include `viewport-fit=cover`
- [x] All six full-screen phase wrappers in `JoinView.tsx` change `min-h-screen` to `min-h-dvh`
- [x] Safe-area padding added to the top and bottom of JoinView phase wrappers
- [x] White bars are gone on iPhone in both the indigo (`bg-indigo-600`) and dark (`bg-gray-900`) phases
- [x] Layout is unchanged on desktop browsers

## Implementation
Shipped across two commits: initial fix in the prior commit (viewport-fit, min-h-dvh, safe-area padding, index.css html/body styles), and dynamic body background color sync added in commit e7adb7c so iOS safe areas match the active phase color precisely.
