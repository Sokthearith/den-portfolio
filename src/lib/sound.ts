import { useSyncExternalStore } from 'react'

// The night, heard: rain, wind and the town's low hum, all made in the
// browser from noise and two sine tones, so there is no file to load and
// nothing to license. Nothing plays until a visitor presses Listen.

export type Layer = 'rain' | 'wind' | 'town'
export type SoundState = { playing: boolean; levels: Record<Layer, number> }

const KEY = 'night-sounds'
const defaults: Record<Layer, number> = { rain: 0.6, wind: 0.35, town: 0.25 }

function stored(): Record<Layer, number> {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (v && typeof v === 'object') return { ...defaults, ...v }
  } catch { /* nothing stored, or storage blocked */ }
  return { ...defaults }
}

let state: SoundState = { playing: false, levels: { ...defaults } }
let loaded = false
const listeners = new Set<() => void>()
const emit = (next: Partial<SoundState>) => {
  state = { ...state, ...next }
  listeners.forEach((l) => l())
}

type Graph = { ctx: AudioContext; master: GainNode; gains: Record<Layer, GainNode> }
let graph: Graph | null = null

function noise(ctx: AudioContext, seconds: number) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate)
  const d = buf.getChannelData(0)
  // Pinkish: white noise through a running average, softer than hiss.
  let last = 0
  for (let i = 0; i < d.length; i++) {
    const white = Math.random() * 2 - 1
    last = 0.97 * last + 0.03 * white
    d[i] = white * 0.35 + last * 3
  }
  return buf
}

function lfo(ctx: AudioContext, hz: number, depth: number, target: AudioParam) {
  const osc = ctx.createOscillator()
  const amt = ctx.createGain()
  osc.frequency.value = hz
  amt.gain.value = depth
  osc.connect(amt).connect(target)
  osc.start()
}

function build(): Graph {
  const ctx = new AudioContext()
  const master = ctx.createGain()
  master.gain.value = 0
  master.connect(ctx.destination)
  const buf = noise(ctx, 4)
  const loop = (rate = 1) => {
    const s = ctx.createBufferSource()
    s.buffer = buf
    s.loop = true
    s.playbackRate.value = rate
    s.start(0, Math.random() * 3)
    return s
  }
  const gains = { rain: ctx.createGain(), wind: ctx.createGain(), town: ctx.createGain() }
  Object.values(gains).forEach((g) => g.connect(master))

  // Rain: the noise opened up high, a steady fall on the roof.
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 700
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 7500
  loop().connect(hp).connect(lp).connect(gains.rain)

  // Wind: slowed noise through a low filter that drifts open and shut.
  const wf = ctx.createBiquadFilter()
  wf.type = 'lowpass'
  wf.frequency.value = 420
  wf.Q.value = 3
  const gust = ctx.createGain()
  gust.gain.value = 0.7
  loop(0.5).connect(wf).connect(gust).connect(gains.wind)
  lfo(ctx, 0.07, 260, wf.frequency)
  lfo(ctx, 0.045, 0.3, gust.gain)

  // The town: a low hum and its octave, far off.
  const hum = ctx.createGain()
  hum.gain.value = 0.5
  const tl = ctx.createBiquadFilter()
  tl.type = 'lowpass'
  tl.frequency.value = 240
  ;[55, 110.4, 165.2].forEach((hz, i) => {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.value = hz
    g.gain.value = [0.5, 0.22, 0.08][i]
    o.connect(g).connect(tl)
    o.start()
  })
  tl.connect(hum).connect(gains.town)
  lfo(ctx, 0.11, 0.12, hum.gain)

  return { ctx, master, gains }
}

// Each layer's fader maps to a gain on a gentle curve, so the low end of the
// fader is usable.
const level = (v: number, layer: Layer) => v * v * { rain: 0.5, wind: 0.9, town: 0.6 }[layer]

function apply(g: Graph, levels: Record<Layer, number>) {
  const t = g.ctx.currentTime
  ;(Object.keys(levels) as Layer[]).forEach((k) => g.gains[k].gain.setTargetAtTime(level(levels[k], k), t, 0.12))
}

export async function startSound() {
  if (!loaded) { loaded = true; state = { ...state, levels: stored() } }
  graph ??= build()
  await graph.ctx.resume()
  apply(graph, state.levels)
  graph.master.gain.setTargetAtTime(0.8, graph.ctx.currentTime, 0.6)
  emit({ playing: true })
}

export function stopSound() {
  if (!graph) return
  const g = graph
  g.master.gain.setTargetAtTime(0, g.ctx.currentTime, 0.18)
  window.setTimeout(() => { if (!state.playing) g.ctx.suspend() }, 900)
  emit({ playing: false })
}

export const toggleSound = () => (state.playing ? stopSound() : startSound())

export function setLevel(layer: Layer, v: number) {
  const levels = { ...state.levels, [layer]: v }
  try { localStorage.setItem(KEY, JSON.stringify(levels)) } catch { /* the levels last this visit */ }
  if (graph) apply(graph, levels)
  emit({ levels })
}

const server: SoundState = { playing: false, levels: defaults }

export const useSound = () =>
  useSyncExternalStore(
    (on) => { listeners.add(on); return () => listeners.delete(on) },
    () => state,
    () => server,
  )
