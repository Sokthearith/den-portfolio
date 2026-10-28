// One-time helper: signs you in to Spotify and prints the refresh token the
// site's /api/now-playing needs. Run it in your own terminal, never paste the
// output anywhere public:
//
//   SPOTIFY_CLIENT_ID=... SPOTIFY_CLIENT_SECRET=... node scripts/spotify-token.mjs
//
// In your Spotify app's settings, add this Redirect URI first:
//   http://127.0.0.1:8888/callback
import { createServer } from 'node:http'

const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret } = process.env
if (!id || !secret) {
  console.error('Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET first (see the top of this file).')
  process.exit(1)
}

const redirect = 'http://127.0.0.1:8888/callback'
const scope = 'user-read-currently-playing user-read-recently-played'
const auth = new URL('https://accounts.spotify.com/authorize')
auth.search = new URLSearchParams({ client_id: id, response_type: 'code', redirect_uri: redirect, scope }).toString()

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', redirect)
  if (url.pathname !== '/callback') return res.writeHead(404).end()
  const code = url.searchParams.get('code')
  if (!code) return res.writeHead(400).end(`Spotify said: ${url.searchParams.get('error') ?? 'no code'}`)
  const token = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirect }),
  }).then((r) => r.json())
  if (!token.refresh_token) {
    res.writeHead(500).end('No refresh token came back. Check the terminal.')
    console.error(token)
  } else {
    res.writeHead(200, { 'content-type': 'text/plain' }).end('Done. Go back to the terminal; you can close this tab.')
    console.log('\nSPOTIFY_REFRESH_TOKEN=' + token.refresh_token + '\n')
    console.log('Add it, with the client id and secret, to Vercel: Project, Settings, Environment Variables.')
  }
  server.close()
})

server.listen(8888, '127.0.0.1', () => {
  console.log('Open this link, sign in and press Agree:\n\n' + auth.toString() + '\n')
})
