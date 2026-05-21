# TICKET-045: Audio Question Type

**Status:** Done
**Created:** 2026-05-21
**Priority:** Medium

## Description

Add a new `AUDIO` question type. When creating a question, the host can pick "Audio" as the type and attach a track from a supported streaming service. Players hear the track play during the question and answer using an open-ended text field.

**Supported platforms:** Spotify, Apple Music, SoundCloud, YouTube / YouTube Music.

The host attaches a track by pasting a URL — the platform is detected automatically and the appropriate embed player is rendered.

Answer options use open-ended text input (scored like OPEN_ENDED questions).

## Acceptance Criteria

- [x] `AUDIO` added to the `QuestionType` enum in `schema.prisma`
- [x] New `AudioQuestion` model stores the track URL, detected platform, and embed URL
- [x] Migration generated and applied
- [x] Question editor UI includes "Audio" as a selectable question type
- [x] When "Audio" is selected, host sees a URL input field; pasting a valid URL from a supported platform previews the embed
- [x] Supported URL patterns recognised: Spotify, SoundCloud, YouTube/YouTube Music, Apple Music
- [x] Answer options for audio questions are rendered as open-ended text input (same as OPEN_ENDED)
- [x] During a live game, the audio embed plays automatically when the question is displayed

## Notes

Implemented with URL-based embedding via platform iframes:
- **YouTube / YouTube Music:** `youtube.com/embed/<id>` (height: 180px)
- **SoundCloud:** oEmbed widget (height: 80px)
- **Spotify:** `open.spotify.com/embed/track/<id>` — 30-second preview (height: 80px)
- **Apple Music:** `embed.music.apple.com` (height: 150px)

Players answer with a textarea; scoring is identical to OPEN_ENDED (text matching against correctAnswers array).
