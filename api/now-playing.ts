// What den is playing on Spotify, how far into it, and the last few songs
// before it. The keys live only in the host's environment
// (SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN); the
// browser only ever sees tracks.

function json(body: unknown, maxAge: number, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': `public, max-age=0, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 4}` },
  })
}

type SpotifyTrack = {
  name: string
  duration_ms: number
  artists: { name: string }[]
  album: { name: string; images: { url: string; width: number }[] }
  external_urls: { spotify: string }
}

export type Track = { title: string; artist: string; album: string; art: string | null; url: string; durationMs: number }
export type Played = { title: string; artist: string; url: string; playedAt: string }

const shape = (t: SpotifyTrack): Track => {
  const images = [...t.album.images].sort((a, b) => a.width - b.width)
  return {
    title: t.name,
    artist: t.artists.map((a) => a.name).join(', '),
    album: t.album.name,
    art: (images.find((i) => i.width >= 300) ?? images[images.length - 1])?.url ?? null,
    url: t.external_urls.spotify,
    durationMs: t.duration_ms,
  }
}

async function accessToken(id: string, secret: string, refresh: string) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { authorization: `Basic ${btoa(`${id}:${secret}`)}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh }),
  })
  if (!res.ok) throw new Error(`Spotify token ${res.status}`)
  return ((await res.json()) as { access_token: string }).access_token
}

export async function GET() {
  const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret, SPOTIFY_REFRESH_TOKEN: refresh } = process.env
  if (!id || !secret || !refresh) {
    // Names only, never values: enough to see which key the host is missing.
    const missing = Object.entries({ SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret, SPOTIFY_REFRESH_TOKEN: refresh }).filter(([, v]) => !v).map(([k]) => k)
    return json({ configured: false, missing }, 60)
  }
  try {
    const token = await accessToken(id, secret, refresh)
    const auth = { authorization: `Bearer ${token}` }
    const [now, recent] = await Promise.all([
      fetch('https://api.spotify.com/v1/me/player/currently-playing', { headers: auth }),
      fetch('https://api.spotify.com/v1/me/player/recently-played?limit=8', { headers: auth }),
    ])
    const history = recent.ok ? ((await recent.json()) as { items: { track: SpotifyTrack; played_at: string }[] }).items : []
    const played: Played[] = history.map((h) => ({ title: h.track.name, artist: h.track.artists.map((a) => a.name).join(', '), url: h.track.external_urls.spotify, playedAt: h.played_at }))

    if (now.status === 200) {
      const body = (await now.json()) as { is_playing: boolean; progress_ms: number | null; item: SpotifyTrack | null; currently_playing_type: string }
      if (body.is_playing && body.item && body.currently_playing_type === 'track') {
        const track = shape(body.item)
        return json({
          configured: true, playing: true, track,
          progressMs: body.progress_ms ?? 0, at: Date.now(),
          recent: played.filter((p) => p.url !== track.url).slice(0, 5),
        }, 15)
      }
    }
    const last = history[0]
    return json({
      configured: true, playing: false,
      track: last ? shape(last.track) : null, playedAt: last?.played_at ?? null,
      recent: played.slice(1, 6),
    }, 60)
  } catch {
    return json({ configured: true, playing: false, track: null, recent: [], error: true }, 60, 502)
  }
}
