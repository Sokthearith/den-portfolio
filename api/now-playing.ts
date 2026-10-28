// What den is playing on Spotify, or played last. The keys live only in the
// host's environment (SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET,
// SPOTIFY_REFRESH_TOKEN); the browser only ever sees the track.

function json(body: unknown, maxAge: number, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': `public, max-age=0, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 4}` },
  })
}

type SpotifyTrack = {
  name: string
  artists: { name: string }[]
  album: { name: string; images: { url: string; width: number }[] }
  external_urls: { spotify: string }
}

export type Track = { title: string; artist: string; album: string; art: string | null; url: string }

const shape = (t: SpotifyTrack): Track => {
  const images = [...t.album.images].sort((a, b) => a.width - b.width)
  return {
    title: t.name,
    artist: t.artists.map((a) => a.name).join(', '),
    album: t.album.name,
    art: (images.find((i) => i.width >= 300) ?? images[images.length - 1])?.url ?? null,
    url: t.external_urls.spotify,
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
  if (!id || !secret || !refresh) return json({ configured: false }, 300)
  try {
    const token = await accessToken(id, secret, refresh)
    const auth = { authorization: `Bearer ${token}` }
    const now = await fetch('https://api.spotify.com/v1/me/player/currently-playing', { headers: auth })
    if (now.status === 200) {
      const body = (await now.json()) as { is_playing: boolean; item: SpotifyTrack | null; currently_playing_type: string }
      if (body.is_playing && body.item && body.currently_playing_type === 'track') return json({ configured: true, playing: true, track: shape(body.item) }, 30)
    }
    const recent = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=1', { headers: auth })
    if (!recent.ok) throw new Error(`Spotify recent ${recent.status}`)
    const last = ((await recent.json()) as { items: { track: SpotifyTrack; played_at: string }[] }).items[0]
    return json({ configured: true, playing: false, track: last ? shape(last.track) : null, playedAt: last?.played_at ?? null }, 60)
  } catch {
    return json({ configured: true, playing: false, track: null, error: true }, 60, 502)
  }
}
