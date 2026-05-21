# TICKET-048: Remove pulsing effect from host avatar on finished screen

**Status:** Done
**Created:** 2026-05-21
**Priority:** Low

## Description

On the player's finished screen ("Thank you for participating!"), the host's avatar had a continuous pulsing animation. Removed.

## Acceptance Criteria

- [x] Host avatar image and fallback initial circle on the finished screen no longer animate

## Notes

Removed `animate-pulse` from the avatar `<img>` and the fallback initial `<div>` in `client/src/pages/JoinView.tsx` (lines 457 and 460).
