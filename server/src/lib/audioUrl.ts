export interface AudioUrlResult {
  platform: string
  embedUrl: string
}

export function parseAudioUrl(raw: string): AudioUrlResult | null {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }

  const host = url.hostname.replace(/^www\./, '')

  // Spotify: open.spotify.com/track/<id>
  if (host === 'open.spotify.com') {
    const match = url.pathname.match(/^\/track\/([A-Za-z0-9]+)/)
    if (!match) return null
    return { platform: 'spotify', embedUrl: `https://open.spotify.com/embed/track/${match[1]}` }
  }

  // YouTube: youtube.com/watch?v=<id> or youtu.be/<id>
  if (host === 'youtube.com' || host === 'music.youtube.com') {
    const id = url.searchParams.get('v')
    if (!id) return null
    return { platform: 'youtube', embedUrl: `https://www.youtube.com/embed/${id}` }
  }
  if (host === 'youtu.be') {
    const id = url.pathname.slice(1)
    if (!id) return null
    return { platform: 'youtube', embedUrl: `https://www.youtube.com/embed/${id}` }
  }

  // SoundCloud: soundcloud.com/<user>/<track>
  if (host === 'soundcloud.com') {
    return {
      platform: 'soundcloud',
      embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(raw.trim())}&auto_play=true&show_artwork=false&show_comments=false`,
    }
  }

  // Apple Music: music.apple.com/<cc>/album/...?i=<trackId>
  if (host === 'music.apple.com') {
    const embedPath = url.pathname + (url.search || '')
    return { platform: 'apple', embedUrl: `https://embed.music.apple.com${embedPath}` }
  }

  return null
}
