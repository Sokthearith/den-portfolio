// JSON with a cache the edge can serve while it refreshes in the background.
function json(body: unknown, maxAge: number, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': `public, max-age=0, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 4}` },
  })
}

// den's last films from Letterboxd's public diary feed: no key, no login.
const USER = 'den4u'
const FEED = `https://letterboxd.com/${USER}/rss/`

export type Film = { title: string; year: string; rating: number | null; watched: string; poster: string | null; url: string; rewatch: boolean }

const tag = (item: string, name: string) => item.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1]?.trim() ?? ''
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')

export function parseFilms(xml: string, limit = 4): Film[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map((m) => m[1])
    .filter((item) => item.includes('<letterboxd:filmTitle>'))
    .slice(0, limit)
    .map((item) => {
      const rating = parseFloat(tag(item, 'letterboxd:memberRating'))
      return {
        title: decode(tag(item, 'letterboxd:filmTitle')),
        year: tag(item, 'letterboxd:filmYear'),
        rating: Number.isFinite(rating) ? rating : null,
        watched: tag(item, 'letterboxd:watchedDate'),
        poster: item.match(/<img src="([^"]+)"/)?.[1] ?? null,
        url: tag(item, 'link'),
        rewatch: tag(item, 'letterboxd:rewatch') === 'Yes',
      }
    })
}

// Letterboxd sometimes answers a busy moment with 503; try twice more before
// giving up.
export async function fetchFilms(limit = 4): Promise<Film[]> {
  let status = 0
  for (const wait of [0, 800, 2000]) {
    if (wait) await new Promise((r) => setTimeout(r, wait))
    const res = await fetch(FEED, { headers: { 'user-agent': 'den-portfolio (+https://github.com/Sokthearith/den-portfolio)' } })
    if (res.ok) return parseFilms(await res.text(), limit)
    status = res.status
  }
  throw new Error(`Letterboxd answered ${status}`)
}

export async function GET() {
  try {
    return json({ films: await fetchFilms(6), profile: `https://letterboxd.com/${USER}/` }, 3600)
  } catch {
    return json({ films: [], profile: `https://letterboxd.com/${USER}/` }, 300, 502)
  }
}
