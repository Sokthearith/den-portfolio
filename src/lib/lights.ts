import { useCallback, useEffect, useMemo, useState } from 'react'
import { MAX_LIT } from './night'

// "Leave a light on": the notes in the footer's town. Everyone sees the ones
// den approved; whoever left a note also sees their own, from this browser,
// while it waits.

export type Light = { id: string; name: string | null; message: string; at: string }
export type PlacedLight = Light & { x: number; row: number; mine: boolean }
export type LeaveError = 'invalid' | 'rate' | 'down'

const KEY = 'den.lights.mine'
const KEEP_MINE = 14 * 864e5 // a note never approved stops showing after two weeks

function readMine(): Light[] {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? '[]') as Light[]
    return all.filter((l) => Date.now() - new Date(l.at).getTime() < KEEP_MINE)
  } catch {
    return []
  }
}
function writeMine(mine: Light[]) {
  try { localStorage.setItem(KEY, JSON.stringify(mine)) } catch { /* private window: the light lasts the visit */ }
}

const hash = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  // Mix the bits, so ids a letter apart still land far apart.
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

// Spread the lights across the town, each in its own stretch so none sit on
// top of another, and never on den's amber window at 0.64.
const LEFT = 0.05
const SPAN = 0.82
const AMBER = [0.6, 0.68] as const

export function place(lights: (Light & { mine: boolean })[]): PlacedLight[] {
  const order = [...lights].sort((a, b) => hash(a.id) - hash(b.id))
  return order.map((l, i) => {
    let x = LEFT + ((i + 0.1 + 0.8 * hash(`${l.id}x`)) / order.length) * SPAN
    if (x > AMBER[0]) x += AMBER[1] - AMBER[0]
    return { ...l, x, row: Math.floor(hash(`${l.id}r`) * 4) }
  })
}

export function useLights(active: boolean) {
  const [configured, setConfigured] = useState(true)
  const [approved, setApproved] = useState<Light[]>([])
  const [mine, setMine] = useState<Light[]>([])

  useEffect(() => {
    if (!active) return
    let alive = true
    setMine(readMine())
    fetch('/api/lights')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { configured: boolean; lights?: Light[] } | null) => {
        if (!alive || !d) return
        setConfigured(d.configured)
        const lights = d.lights ?? []
        setApproved(lights)
        // Once den approves a note it is everyone's; stop keeping it here.
        const ids = new Set(lights.map((l) => l.id))
        const waiting = readMine().filter((l) => !ids.has(l.id))
        writeMine(waiting)
        setMine(waiting)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [active])

  const leave = useCallback(async (name: string, message: string, website: string): Promise<{ light?: Light; error?: LeaveError }> => {
    try {
      const res = await fetch('/api/lights', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, message, website }),
      })
      const out = (await res.json()) as { ok: boolean; light?: Light; error?: LeaveError }
      if (!out.ok || !out.light) return { error: out.error ?? 'down' }
      const light = out.light
      setMine((m) => {
        const next = [light, ...m]
        writeMine(next)
        return next
      })
      return { light }
    } catch {
      return { error: 'down' }
    }
  }, [])

  const lights = useMemo(() => {
    const ids = new Set(mine.map((l) => l.id))
    return place([
      ...mine.map((l) => ({ ...l, mine: true })),
      ...approved.filter((l) => !ids.has(l.id)).map((l) => ({ ...l, mine: false })),
    ].slice(0, MAX_LIT))
  }, [mine, approved])

  return { configured, lights, leave }
}
