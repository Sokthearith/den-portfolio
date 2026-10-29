import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { record, seeded, useRun, type Frame } from '../../lib/algo'
import {
  NEVER, PATHS, RUNS, SLOW, STREET, WALL,
  clear, dimsFor, line, maze, paint, place, scatter, showcase, xy,
  type Cell, type Grid, type PathId, type PathState,
} from '../../lib/paths'
import { useTheme } from '../../lib/theme'
import { Action, Code, Controls, Picker, Readout } from './Deck'
import '../../styles/algo-path.css'

// Finding the way home: the town's streets from above at night, a walker
// and the lit window. Buildings and slow streets are drawn straight onto the
// grid; a search then spreads like lamplight from the walker, the newest
// streets brightest, until it reaches home and the way back lights up.
// The grid is a canvas, since a frame can touch every one of its cells.
type Tool = 'wall' | 'slow' | 'erase'
const TOOLS: { id: Tool; name: string }[] = [{ id: 'wall', name: 'Walls' }, { id: 'slow', name: 'Slow streets' }, { id: 'erase', name: 'Erase' }]
const PAINT: Record<Tool, Cell> = { wall: WALL, slow: SLOW, erase: STREET }

type Summary = { visited: number; length: number; cost: number; home: boolean; from: Frame<PathState>[] }
type Drag = { mode: 'paint'; value: Cell; last: number } | { mode: 'start' | 'goal'; last: number }

// The town's colours live in algo-path.css as --pt-* properties on .pt-town; they are
// read through a probe, which resolves color-mix() into a colour the canvas
// can use. The light is also read back as rgb, for its fading glow.
const KEYS = ['street', 'grid', 'block', 'edge', 'window', 'slow', 'light', 'ink'] as const
type Palette = Record<(typeof KEYS)[number], string> & { glow: [number, number, number]; faint: number }

function readPalette(host: HTMLElement): Palette {
  const probe = document.createElement('span')
  probe.style.display = 'none'
  host.appendChild(probe)
  const out = {} as Palette
  for (const k of KEYS) {
    probe.style.color = `var(--pt-${k})`
    out[k] = getComputedStyle(probe).color
  }
  host.removeChild(probe)
  out.faint = parseFloat(getComputedStyle(host).getPropertyValue('--pt-faint')) || 0.12
  const px = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  out.glow = [255, 190, 110]
  if (px) {
    px.fillStyle = out.light
    px.fillRect(0, 0, 1, 1)
    const [r, g, b] = px.getImageData(0, 0, 1, 1).data
    out.glow = [r, g, b]
  }
  return out
}

// Slow streets are hatched like a lane; the tile repeats from the canvas's
// corner, so neighbouring slow cells join into one stretch of road.
function hatch(ctx: CanvasRenderingContext2D, color: string, cell: number) {
  const s = Math.max(4, Math.round(cell / 3))
  const tile = document.createElement('canvas')
  tile.width = tile.height = s
  const t = tile.getContext('2d')!
  t.strokeStyle = color
  t.lineWidth = Math.max(1, s / 4.5)
  t.beginPath()
  t.moveTo(0, s); t.lineTo(s, 0)
  t.moveTo(-s / 2, s / 2); t.lineTo(s / 2, -s / 2)
  t.moveTo(s / 2, s * 1.5); t.lineTo(s * 1.5, s / 2)
  t.stroke()
  return ctx.createPattern(tile, 'repeat')
}

function draw(ctx: CanvasRenderingContext2D, W: number, H: number, g: Grid, st: PathState | undefined, pal: Palette) {
  const cw = W / g.w, ch = H / g.h
  // Cell edges on whole device pixels, so neighbouring cells never leave a seam.
  const xs = Array.from({ length: g.w + 1 }, (_, i) => Math.round(i * cw))
  const ys = Array.from({ length: g.h + 1 }, (_, i) => Math.round(i * ch))
  const rect = (c: number, inset = 0) => {
    const x = c % g.w, y = Math.floor(c / g.w)
    ctx.fillRect(xs[x] + inset, ys[y] + inset, xs[x + 1] - xs[x] - 2 * inset, ys[y + 1] - ys[y] - 2 * inset)
  }
  const mid = (c: number): [number, number] => { const [x, y] = xy(g, c); return [(xs[x] + xs[x + 1]) / 2, (ys[y] + ys[y + 1]) / 2] }
  const tr = st?.trace
  const homeward = st?.end === 'home'

  ctx.globalAlpha = 1
  ctx.fillStyle = pal.street
  ctx.fillRect(0, 0, W, H)

  // Slow streets, under the light.
  const lane = hatch(ctx, pal.slow, cw)
  for (let c = 0; c < g.cells.length; c++) {
    if (g.cells[c] !== SLOW) continue
    ctx.globalAlpha = 0.1; ctx.fillStyle = pal.slow; rect(c)
    if (lane) { ctx.globalAlpha = 0.5; ctx.fillStyle = lane; rect(c) }
  }

  // The lamplight: a searched street is brightest when it is new and dims
  // as the search moves on; while the way home lights, it dims further.
  const frontier: number[] = []
  if (st && tr) {
    const tau = Math.max(18, (g.w * g.h) / 28)
    ctx.fillStyle = pal.light
    for (let c = 0; c < g.cells.length; c++) {
      if (tr.visitT[c] <= st.t) {
        const age = st.n - tr.visitN[c]
        ctx.globalAlpha = (pal.faint + (0.68 - pal.faint) * Math.exp(-age / tau)) * (homeward ? 0.6 : 1)
        rect(c)
      } else if (tr.discT[c] <= st.t && tr.discT[c] !== NEVER) frontier.push(c)
    }
    // The frontier: the lamps at the edge of the light, each with a halo.
    const spill = Math.round(cw * 0.32)
    ctx.globalAlpha = homeward ? 0.08 : 0.16
    for (const c of frontier) rect(c, -spill)
    ctx.globalAlpha = homeward ? 0.5 : 0.95
    for (const c of frontier) rect(c, Math.max(1, Math.round(cw * 0.12)))
  }

  // The window's glow spills onto the streets round it, under the buildings.
  const [gx, gy] = mid(g.goal)
  const reached = homeward && st!.lit >= tr!.path.length
  if (st?.end !== 'none') {
    const r = cw * (reached ? 3.4 : 2.4)
    const [R, G, B] = pal.glow
    const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, r)
    grad.addColorStop(0, `rgba(${R},${G},${B},${reached ? 0.6 : 0.34})`)
    grad.addColorStop(1, `rgba(${R},${G},${B},0)`)
    ctx.globalAlpha = 1
    ctx.fillStyle = grad
    ctx.fillRect(gx - r, gy - r, r * 2, r * 2)
  }

  // The street grid, faint, so a visitor can see the cells they draw on.
  ctx.globalAlpha = 0.7
  ctx.fillStyle = pal.grid
  const hair = Math.max(1, Math.round(cw / 28))
  for (let x = 1; x < g.w; x++) ctx.fillRect(xs[x], 0, hair, H)
  for (let y = 1; y < g.h; y++) ctx.fillRect(0, ys[y], W, hair)

  // Buildings: neighbouring walls join into one block with a lighter edge
  // round it, and a scatter of windows, a few of them lit.
  const edge = Math.max(1, Math.round(cw * 0.07))
  for (let c = 0; c < g.cells.length; c++) {
    if (g.cells[c] !== WALL) continue
    const x = c % g.w, y = Math.floor(c / g.w)
    const x0 = xs[x], x1 = xs[x + 1], y0 = ys[y], y1 = ys[y + 1]
    ctx.globalAlpha = 1
    ctx.fillStyle = pal.block
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0)
    ctx.fillStyle = pal.edge
    if (y > 0 && g.cells[c - g.w] !== WALL) ctx.fillRect(x0, y0, x1 - x0, edge)
    if (y < g.h - 1 && g.cells[c + g.w] !== WALL) ctx.fillRect(x0, y1 - edge, x1 - x0, edge)
    if (x > 0 && g.cells[c - 1] !== WALL) ctx.fillRect(x0, y0, edge, y1 - y0)
    if (x < g.w - 1 && g.cells[c + 1] !== WALL) ctx.fillRect(x1 - edge, y0, edge, y1 - y0)
    const hv = Math.imul(c + 1, 2654435761) >>> 0
    if (hv % 4 === 0) {
      const s = Math.max(2, Math.round(cw * 0.2))
      const ox = x0 + Math.round(cw * (0.22 + ((hv >>> 4) % 4) * 0.12)), oy = y0 + Math.round(ch * (0.22 + ((hv >>> 7) % 4) * 0.12))
      const lit = (hv >>> 10) % 3 === 0
      ctx.fillStyle = lit ? pal.light : pal.window
      ctx.globalAlpha = lit ? 0.85 : 1
      ctx.fillRect(ox, oy, s, s)
    }
  }

  // The way home, lit from the walker's end one cell at a time.
  if (homeward && st && tr && st.lit > 0) {
    ctx.globalAlpha = 1
    ctx.strokeStyle = pal.light
    ctx.lineWidth = Math.max(3, cw * 0.34)
    ctx.lineCap = 'square'
    ctx.lineJoin = 'miter'
    ctx.beginPath()
    for (let i = 0; i < st.lit; i++) { const [px, py] = mid(tr.path[i]); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py) }
    if (st.lit === 1) { const [px, py] = mid(tr.path[0]); ctx.lineTo(px + 0.01, py) }
    ctx.stroke()
  }

  // The street being searched now.
  if (st && st.cur >= 0 && st.cur !== g.start && st.cur !== g.goal) {
    const [cx, cy] = mid(st.cur)
    const lw = Math.max(1.5, cw * 0.09)
    ctx.globalAlpha = 1
    ctx.strokeStyle = pal.ink
    ctx.lineWidth = lw
    ctx.strokeRect(cx - cw / 2 + lw / 2, cy - ch / 2 + lw / 2, cw - lw, ch - lw)
  }

  // Home: a house in the ink with its window in the light, dark only when
  // there is no way to it. It and the walker are drawn a little larger than
  // a cell, so they read as the two places that matter.
  const u = cw * 1.3
  ctx.globalAlpha = 1
  ctx.fillStyle = pal.street
  ctx.beginPath(); ctx.arc(gx, gy, u * 0.46, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = pal.ink
  ctx.beginPath()
  ctx.moveTo(gx - u * 0.36, gy - u * 0.04)
  ctx.lineTo(gx, gy - u * 0.36)
  ctx.lineTo(gx + u * 0.36, gy - u * 0.04)
  ctx.closePath(); ctx.fill()
  ctx.fillRect(gx - u * 0.26, gy - u * 0.06, u * 0.52, u * 0.36)
  ctx.fillStyle = st?.end === 'none' ? pal.block : pal.light
  ctx.fillRect(gx - u * 0.1, gy + u * 0.02, u * 0.2, u * 0.17)

  // The walker: a small figure in the ink, on a patch of dark street.
  const [sx, sy] = mid(g.start)
  ctx.fillStyle = pal.street
  ctx.beginPath(); ctx.arc(sx, sy, u * 0.46, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = pal.ink
  ctx.beginPath(); ctx.arc(sx, sy - u * 0.2, u * 0.12, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath()
  ctx.moveTo(sx - u * 0.19, sy + u * 0.32)
  ctx.lineTo(sx - u * 0.1, sy - u * 0.04)
  ctx.lineTo(sx + u * 0.1, sy - u * 0.04)
  ctx.lineTo(sx + u * 0.19, sy + u * 0.32)
  ctx.closePath(); ctx.fill()
}

const summarize = (st: PathState, counts: Record<string, number>, from: Frame<PathState>[]): Summary =>
  ({ visited: counts.visited, length: counts.length, cost: counts.cost, home: st.end === 'home', from })

export default function PathTown() {
  const theme = useTheme()
  const [alg, setAlg] = useState<PathId>('bfs')
  const [tool, setTool] = useState<Tool>('wall')
  // The first town is seeded, so the prerendered page and the browser agree;
  // after mount it is drawn again at a size that suits the screen.
  const [grid, setGrid] = useState<Grid>(() => showcase(41, 21, seeded(41 * 21)))
  const frames = useMemo(() => record(RUNS[alg](grid)), [alg, grid])
  const run = useRun(frames, { initialSpeed: 7 })
  const info = PATHS.find((p) => p.id === alg)!

  // The last finished run of each search on this grid; a new grid starts a
  // new table. A run counts once it is played (or skipped) to its end. On the
  // first render with a new recording the run still reports the old one's
  // place, so that render is let pass before anything is written down.
  const [results, setResults] = useState<{ grid: Grid; rows: Partial<Record<PathId, Summary>> }>({ grid, rows: {} })
  const rows = results.grid === grid ? results.rows : {}
  const [known, setKnown] = useState(frames)
  if (known !== frames) setKnown(frames)
  else if (run.done && frames.length > 1 && rows[alg]?.from !== frames) {
    const end = frames[frames.length - 1]
    setResults({ grid, rows: { ...rows, [alg]: summarize(end.state, end.counts, frames) } })
  }

  const stage = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [box, setBox] = useState({ w: 0, dpr: 1 })

  useLayoutEffect(() => {
    const el = stage.current
    if (!el) return
    const [cols, rows] = dimsFor(el.clientWidth)
    if (cols !== 41 || rows !== 21) setGrid(showcase(cols, rows, seeded(cols * rows)))
  }, [])

  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const measure = () => setBox({ w: el.clientWidth, dpr: Math.min(3, window.devicePixelRatio || 1) })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Colours are read again whenever the theme changes.
  const pal = useRef<{ theme: string; p: Palette } | null>(null)
  const st = run.frame?.state
  useEffect(() => {
    const el = canvas.current, host = stage.current
    const ctx = el?.getContext('2d')
    if (!el || !host || !ctx || !box.w) return
    const W = Math.round(box.w * box.dpr), H = Math.round(((box.w * grid.h) / grid.w) * box.dpr)
    if (el.width !== W) el.width = W
    if (el.height !== H) el.height = H
    if (pal.current?.theme !== theme) pal.current = { theme, p: readPalette(host) }
    draw(ctx, W, H, grid, st, pal.current.p)
  }, [grid, st, box, theme])

  // Drawing: walls and slow streets follow the pointer (starting a stroke on
  // the kind being drawn rubs it out instead); the walker and the window are
  // picked up and carried. The canvas takes the touch, so the page holds
  // still under a finger.
  const drag = useRef<Drag | null>(null)
  const cellAt = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = Math.min(grid.w - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * grid.w)))
    const y = Math.min(grid.h - 1, Math.max(0, Math.floor(((e.clientY - r.top) / r.height) * grid.h)))
    return y * grid.w + x
  }
  const onDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const c = cellAt(e)
    if (c === grid.start || c === grid.goal) {
      drag.current = { mode: c === grid.start ? 'start' : 'goal', last: c }
      e.currentTarget.style.cursor = 'grabbing'
      return
    }
    const want = PAINT[tool]
    const value = want !== STREET && grid.cells[c] === want ? STREET : want
    drag.current = { mode: 'paint', value, last: c }
    setGrid((g) => paint(g, [c], value))
  }
  const onMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const d = drag.current
    const c = cellAt(e)
    if (!d) { e.currentTarget.style.cursor = c === grid.start || c === grid.goal ? 'grab' : 'crosshair'; return }
    if (c === d.last) return
    const from = d.last
    d.last = c
    if (d.mode === 'paint') setGrid((g) => paint(g, line(g, from, c), d.value))
    else setGrid((g) => place(g, d.mode, c))
  }
  const onUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    drag.current = null
    e.currentTarget.style.cursor = ''
  }

  const frame = run.frame
  const [cols, rowsN] = [grid.w, grid.h]
  const status = st?.end === 'none' ? 'No way home.' : st?.end === 'home' ? 'Home found.' : ''

  return (
    <div className="viz pt-town">
      <div className="viz__main">
        <div className="viz__bar">
          <Picker label="Search" options={PATHS.map(({ id, name }) => ({ id, name }))} value={alg} onChange={setAlg} />
          <div className="viz__tools">
            <Picker label="Draw" options={TOOLS} value={tool} onChange={setTool} />
            <Action onClick={() => setGrid((g) => showcase(g.w, g.h, Math.random))}>Town</Action>
            <Action onClick={() => setGrid((g) => maze(g, Math.random))}>Maze</Action>
            <Action onClick={() => setGrid((g) => scatter(g, Math.random))}>Scatter</Action>
            <Action onClick={() => setGrid(clear)}>Clear</Action>
          </div>
        </div>
        <div className="viz__stage pt-stage" ref={stage}>
          <canvas
            ref={canvas}
            className="pt-canvas"
            style={{ aspectRatio: `${cols} / ${rowsN}` }}
            role="img"
            aria-label={`A town of ${cols} by ${rowsN} streets. ${info.full}, step ${run.i} of ${frames.length - 1}. ${status}`}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onLostPointerCapture={onUp}
          />
          {st?.end === 'none' && (
            <div className="pt-none" role="status">
              <span className="pt-none__head">No way home</span>
              <span className="pt-none__line">The window is walled off.</span>
            </div>
          )}
        </div>
        <div className="pt-under">
          <p className="viz__hint">Drag on the town to draw. Drag the walker or the window to move them.</p>
          <ul className="pt-key" aria-label="Key">
            <li><i className="pt-key__sw" data-k="block" />Building</li>
            <li><i className="pt-key__sw" data-k="slow" />Slow street, cost 5</li>
            <li><i className="pt-key__sw" data-k="seen" />Visited</li>
            <li><i className="pt-key__sw" data-k="front" />Frontier</li>
          </ul>
        </div>
        <Controls run={run} label={info.full} />
      </div>
      <div className="viz__side">
        <Code lines={info.code} active={frame?.line ?? -1} label={info.full} />
        {frame && <Readout note={frame.note} counts={frame.counts} />}
        <table className="pt-results">
          <caption>This town, each search's last run</caption>
          <thead><tr><th scope="col">Search</th><th scope="col">Visited</th><th scope="col">Length</th><th scope="col">Cost</th></tr></thead>
          <tbody>
            {PATHS.map((p) => {
              const r = rows[p.id]
              return (
                <tr key={p.id} data-on={p.id === alg || undefined}>
                  <th scope="row">{p.name}</th>
                  {!r ? <td colSpan={3} className="pt-results__none">Not run yet</td>
                    : r.home ? <><td>{r.visited}</td><td>{r.length}</td><td>{r.cost}</td></>
                      : <><td>{r.visited}</td><td colSpan={2} className="pt-results__none">No way home</td></>}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
