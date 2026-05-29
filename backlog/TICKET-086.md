# TICKET-086 — Show next question preview in Host result view

**Status:** Open  
**Type:** Feature  
**Priority:** Medium

## Goal

After a question timer expires, the host result view should display a preview of the upcoming question in full, alongside the current results and leaderboard. This gives the host a chance to read and prepare for the next question before manually advancing. The "Next" button remains the only way to proceed, keeping the host in control of the game pace.

## Acceptance criteria

- [ ] When the timer ends, the result view renders the next question's text (and answer options if applicable) below the leaderboard
- [ ] The preview is clearly labelled as the upcoming question (e.g. "Nästa fråga")
- [ ] If the current question is the last one, no preview is shown
- [ ] The "Next" button advances the game as before — the preview does not auto-advance
- [ ] The preview is readable at a glance without scrolling on a typical laptop screen
