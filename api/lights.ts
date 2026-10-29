// "Leave a light on": the notes visitors leave in the footer's town, kept in
// Supabase (supabase/lights.sql). The keys live only in the host's environment
// (SUPABASE_URL, SUPABASE_SECRET_KEY); the browser never talks to Supabase.
// A note waits until den ticks `approved`; only then does GET return it.

export type Light = { id: string; name: string | null; message: string; at: string }

const MAX_MESSAGE = 140
const MAX_NAME = 32
const PER_IP_PER_DAY = 3
const ALL_PER_HOUR = 30

function json(body: unknown, status = 200, maxAge = 0) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': maxAge ? `public, max-age=0, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 4}` : 'no-store',
    },
  })
}

function config() {
  const { SUPABASE_URL: url, SUPABASE_SECRET_KEY: key } = process.env
  // Names only, never values: enough to see which key the host is missing.
  const missing = Object.entries({ SUPABASE_URL: url, SUPABASE_SECRET_KEY: key }).filter(([, v]) => !v).map(([k]) => k)
  return url && key ? { url: url.replace(/\/+$/, ''), key } : { missing }
}

// The new sb_secret_ keys go in `apikey` alone; the older service_role JWT
// also goes in as the bearer.
function rest(url: string, key: string, path: string, init: RequestInit = {}) {
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      ...(key.startsWith('sb_') ? {} : { authorization: `Bearer ${key}` }),
      'content-type': 'application/json',
      ...init.headers,
    },
  })
}

type Row = { id: string; name: string | null; message: string; created_at: string }
const shape = (r: Row): Light => ({ id: r.id, name: r.name, message: r.message, at: r.created_at })

export async function GET() {
  const c = config()
  if (!('url' in c)) return json({ configured: false, missing: c.missing }, 200, 60)
  try {
    const res = await rest(c.url, c.key, 'lights?select=id,name,message,created_at&approved=eq.true&order=created_at.desc&limit=12')
    if (!res.ok) throw new Error(`Supabase ${res.status}`)
    return json({ configured: true, lights: ((await res.json()) as Row[]).map(shape) }, 200, 60)
  } catch {
    return json({ configured: true, lights: [] }, 200, 15)
  }
}

// One line of plain text: no control or direction-override characters, no runs
// of whitespace.
const clean = (v: unknown) =>
  typeof v === 'string'
    ? v.normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, ' ').replace(/\s+/g, ' ').trim()
    : ''
const length = (s: string) => [...s].length

async function hashIp(ip: string, key: string) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(`lights:${ip}`))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

type Outcome = { ok: true; light: Light } | { ok: false; error: 'invalid' | 'rate' | 'down' }
const status = { invalid: 400, rate: 429, down: 503 } as const

async function leave(fields: Record<string, unknown>, ip: string): Promise<Outcome> {
  const c = config()
  if (!('url' in c)) return { ok: false, error: 'down' }
  const message = clean(fields.message)
  const name = clean(fields.name)
  if (!message || length(message) > MAX_MESSAGE || length(name) > MAX_NAME) return { ok: false, error: 'invalid' }

  // The honeypot: a field people never see. A bot that fills it is told it
  // worked and nothing is kept.
  if (clean(fields.website)) return { ok: true, light: { id: crypto.randomUUID(), name: name || null, message, at: new Date().toISOString() } }

  try {
    const ipHash = await hashIp(ip, c.key)
    const day = new Date(Date.now() - 864e5).toISOString()
    const hour = new Date(Date.now() - 36e5).toISOString()
    const [mine, all] = await Promise.all([
      rest(c.url, c.key, `lights?select=id&ip_hash=eq.${ipHash}&created_at=gte.${encodeURIComponent(day)}&limit=${PER_IP_PER_DAY}`),
      rest(c.url, c.key, `lights?select=id&created_at=gte.${encodeURIComponent(hour)}&limit=${ALL_PER_HOUR}`),
    ])
    if (!mine.ok || !all.ok) throw new Error(`Supabase ${mine.status}/${all.status}`)
    if (((await mine.json()) as unknown[]).length >= PER_IP_PER_DAY || ((await all.json()) as unknown[]).length >= ALL_PER_HOUR) {
      return { ok: false, error: 'rate' }
    }

    const res = await rest(c.url, c.key, 'lights?select=id,name,message,created_at', {
      method: 'POST',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({ name: name || null, message, ip_hash: ipHash }),
    })
    if (!res.ok) throw new Error(`Supabase ${res.status}`)
    return { ok: true, light: shape(((await res.json()) as Row[])[0]) }
  } catch {
    return { ok: false, error: 'down' }
  }
}

// The page posts JSON; without JavaScript the form posts itself, and the
// answer is a trip back to the same page, to the note that says how it went.
export async function POST(request: Request) {
  const ip = request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const isForm = (request.headers.get('content-type') ?? '').includes('application/x-www-form-urlencoded')
  let fields: Record<string, unknown> = {}
  try {
    fields = isForm ? Object.fromEntries(new URLSearchParams(await request.text())) : ((await request.json()) as Record<string, unknown>)
  } catch {
    return json({ ok: false, error: 'invalid' }, 400)
  }
  const out = await leave(fields ?? {}, ip)

  if (isForm) {
    let back = '/'
    try {
      const ref = new URL(request.headers.get('referer') ?? '')
      if (ref.host === new URL(request.url).host) back = ref.pathname
    } catch { /* no usable referer: home */ }
    return new Response(null, { status: 303, headers: { location: `${back}#light-${out.ok ? 'on' : out.error}`, 'cache-control': 'no-store' } })
  }
  return json(out, out.ok ? 200 : status[out.error])
}
