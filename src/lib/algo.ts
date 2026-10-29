import { useCallback, useEffect, useRef, useState } from 'react'

// The engine every visualizer on /algorithms runs on. An algorithm is written
// as a generator that yields a Frame at each step it takes (a comparison, a
// swap, a visit); the whole run is recorded up front, so it can be played,
// paused, stepped either way, or scrubbed like a film.
export type Counts = Record<string, number>
export type Frame<S> = {
  state: S
  line: number // the line of the algorithm's code that is running (0-based), -1 for none
  note: string // what is happening, in a few plain words
  counts: Counts
}

// Runs a generator to the end and keeps every frame, up to a cap so a runaway
// input can never hang the page.
export function record<S>(run: Generator<Frame<S>, void>, cap = 30000): Frame<S>[] {
  const frames: Frame<S>[] = []
  for (const f of run) {
    frames.push(f)
    if (frames.length >= cap) break
  }
  return frames
}

// Speeds, in steps a second, for the speed control (an index into this list).
export const SPEEDS = [1, 2, 4, 8, 15, 30, 60, 120, 240, 480]

export type Run<S> = {
  frames: Frame<S>[]
  i: number
  frame: Frame<S> | undefined
  playing: boolean
  done: boolean
  speed: number // index into SPEEDS
  setSpeed: (s: number) => void
  toggle: () => void
  pause: () => void
  step: (d: number) => void
  seek: (i: number) => void
}

// Plays a recording. A new recording starts from its first frame, paused
// unless `autoplay`; playback advances by real time, so a slow frame skips
// ahead instead of slowing the algorithm down.
export function useRun<S>(frames: Frame<S>[], { autoplay = false, initialSpeed = 4 } = {}): Run<S> {
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(initialSpeed)
  const last = frames.length - 1

  // A new recording rewinds: adjusting state while rendering, the way React
  // recommends for state that follows a prop.
  const [seen, setSeen] = useState(frames)
  if (seen !== frames) {
    setSeen(frames)
    setI(0)
    setPlaying(autoplay && frames.length > 1)
  }

  // Where playback stands, for the clock and the buttons to read outside render.
  const pos = useRef(0)
  useEffect(() => { pos.current = i })

  const at = useRef(0)
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let prev = performance.now()
    at.current = 0
    const tick = (now: number) => {
      at.current += ((now - prev) / 1000) * SPEEDS[speed]
      prev = now
      const n = Math.floor(at.current)
      if (n > 0) {
        at.current -= n
        const next = Math.min(last, pos.current + n)
        pos.current = next
        setI(next)
        if (next >= last) { setPlaying(false); return }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, speed, last])

  const toggle = useCallback(() => {
    if (last < 1) return
    if (!playing && pos.current >= last) setI(0) // at the end, play starts over
    setPlaying(!playing)
  }, [last, playing])
  const pause = useCallback(() => setPlaying(false), [])
  const step = useCallback((d: number) => { setPlaying(false); setI((x) => Math.max(0, Math.min(last, x + d))) }, [last])
  const seek = useCallback((n: number) => { setPlaying(false); setI(Math.max(0, Math.min(last, n))) }, [last])

  // On the render that meets a new recording, the rewind above has not
  // landed yet: read it as already at its first frame, so nothing indexes the
  // new frames with the old position.
  const fresh = seen !== frames
  const at0 = fresh ? 0 : Math.min(i, Math.max(0, last))
  return { frames, i: at0, frame: frames[at0], playing: fresh ? autoplay && frames.length > 1 : playing, done: at0 >= last, speed, setSpeed, toggle, pause, step, seek }
}

// A seeded random source, for inputs that should be the same in the
// prerendered page and the browser (and from one visit to the next).
export function seeded(seed: number) {
  let s = seed % 2147483647 || 1
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}
