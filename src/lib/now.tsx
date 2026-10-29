import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// What den is watching and playing. The build fetches the films so they are
// in the page before any script runs; in the browser both refresh from /api.

export type Film = { title: string; year: string; rating: number | null; watched: string; poster: string | null; url: string; rewatch: boolean }
export type Track = { title: string; artist: string; album: string; art: string | null; url: string; durationMs: number }
export type Played = { title: string; artist: string; album: string; art: string | null; url: string; playedAt: string }
export type Listening = {
  configured: boolean
  playing?: boolean
  track?: Track | null
  progressMs?: number
  at?: number
  playedAt?: string | null
  recent?: Played[]
}
export type NowSeed = { films: Film[] }

const Seed = createContext<NowSeed>({ films: [] })

export const NowProvider = ({ seed, children }: { seed: NowSeed; children: ReactNode }) => <Seed.Provider value={seed}>{children}</Seed.Provider>

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path)
    return res.ok ? ((await res.json()) as T) : null
  } catch {
    return null
  }
}

export function useNow(active: boolean) {
  const seed = useContext(Seed)
  const [films, setFilms] = useState(seed.films)
  const [listening, setListening] = useState<Listening | null>(null)

  useEffect(() => {
    if (!active) return
    let alive = true
    get<{ films: Film[] }>('/api/films').then((d) => { if (alive && d?.films.length) setFilms(d.films) })
    const poll = () => get<Listening>('/api/now-playing').then((d) => { if (alive && d) setListening(d) })
    poll()
    // Keep the song current while the section is on screen and the tab is open.
    const id = window.setInterval(() => { if (!document.hidden) poll() }, 30_000)
    return () => { alive = false; window.clearInterval(id) }
  }, [active])

  // Ask again the moment the current song should have ended.
  useEffect(() => {
    if (!active || !listening?.playing || !listening.track || listening.at === undefined) return
    const left = listening.track.durationMs - (listening.progressMs ?? 0) - (Date.now() - listening.at)
    const id = window.setTimeout(() => get<Listening>('/api/now-playing').then((d) => d && setListening(d)), Math.max(2000, left + 1500))
    return () => window.clearTimeout(id)
  }, [active, listening])

  return { films, listening }
}
