# TICKET-048: Remove pulsing effect from host avatar on finished screen

**Status:** Open
**Created:** 2026-05-21
**Priority:** Low

## Description

On the player's finished screen ("Thank you for participating!"), the host's avatar has a continuous pulsing animation. Remove the pulse — the avatar should be static.

## Acceptance Criteria

- [ ] Host avatar image and fallback initial circle on the finished screen no longer animate

## Files Likely Affected

- `client/src/pages/JoinView.tsx` — remove `animate-pulse` from the avatar `<img>` (line 457) and the fallback `<div>` (line 460)
