# TICKET-029: Fix cropped images in game view

**Status:** Done  
**Created:** 2026-05-19  
**Priority:** Low  

## Description
When a question with an image is shown during an active game, the image is cropped. This happens in both the host view and the player view because `object-cover` is used — it fills the fixed-height container by cropping the sides or top/bottom of the image rather than fitting the whole image inside.

## Root cause
Two specific locations:

- `client/src/pages/HostView.tsx` line 368 — `className="mb-4 max-h-48 w-full rounded-xl object-cover"`
- `client/src/pages/JoinView.tsx` line 484 — `className="mx-4 max-h-40 rounded-xl object-cover"`

Both use `object-cover` with a capped height. `object-cover` scales the image to cover the container, cropping whatever overflows. The correct value is `object-contain`, which scales the image to fit entirely within the bounds while preserving the aspect ratio.

## Acceptance Criteria
- [x] In the host view, question images display the full image without cropping
- [x] In the player view (JoinView), question images display the full image without cropping
- [x] Images do not overflow their containers or push layout elements out of place
- [x] The fix does not affect avatar images elsewhere (those correctly use `object-cover`)

## Notes
- Change `object-cover` → `object-contain` on both `<img>` elements
- The `w-full` on the HostView image combined with `object-contain` will letterbox the image inside the max-height; adding `bg-black/5` or similar subtle background to the container looks cleaner for non-square images if desired, but is optional
- The QuizEditor preview at line 551 also uses `object-cover` (`h-32 w-auto`), but that is a thumbnail in the editor — not part of the game view — so it is out of scope for this ticket

## Implementation
Shipped in commit e14ba5a. Changed `object-cover` to `object-contain` in `HostView.tsx` and `JoinView.tsx`.
