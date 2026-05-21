# TICKET-045: Audio Question Type

**Status:** Open
**Created:** 2026-05-21
**Priority:** Medium

## Description

Add a new `AUDIO` question type. When creating a question, the host can pick "Audio" as the type and attach a track from a supported streaming service. Players hear the track play during the question and answer using radio buttons (single-select).

**Supported platforms:** Spotify, Apple Music, SoundCloud, YouTube / YouTube Music.

The host attaches a track by pasting a URL — the platform is detected automatically and the appropriate embed player is rendered.

Answer options behave like multiple-choice but rendered as radio buttons.

## Acceptance Criteria

- [ ] `AUDIO` added to the `QuestionType` enum in `schema.prisma`
- [ ] New `AudioQuestion` model stores the track URL, detected platform, and any embed metadata
- [ ] Migration generated and applied
- [ ] Question editor UI includes "Audio" as a selectable question type
- [ ] When "Audio" is selected, host sees a URL input field; pasting a valid URL from a supported platform previews the embed
- [ ] Supported URL patterns recognised: Spotify, SoundCloud, YouTube/YouTube Music, Apple Music
- [ ] Answer options for audio questions are rendered as radio buttons (single-select)
- [ ] During a live game, the audio embed plays automatically (or on host trigger) when the question is displayed

## Files Likely Affected

- `server/prisma/schema.prisma` — add `AUDIO` to `QuestionType` enum; add `AudioQuestion` model
- `server/src/routes/` — question create/update endpoints to handle audio metadata
- `client/src/` — question editor component (add Audio type option + URL input + embed preview)
- `client/src/components/` — new `AudioPlayer` embed component (platform-aware)
- `client/src/pages/HostView.tsx` — render audio embed during live question phase
- `client/src/pages/JoinView.tsx` — render radio button answer options for audio questions

## Notes

URL-based embedding is the pragmatic first step — each platform has an embed/iframe API that works without user auth:
- **YouTube / YouTube Music:** `youtube.com/embed/<id>`
- **SoundCloud:** oEmbed widget
- **Spotify:** `open.spotify.com/embed/track/<id>` (30-second preview — intentional, no Premium required)
- **Apple Music:** MusicKit JS embed
