import { useMemo, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { record, seeded, useRun, SPEEDS } from '../../lib/algo'
import { GRAPHS, RUNS, nightMap, type Graph, type GraphId, type GraphState, type Place } from '../../lib/graphs'
import { Action, Code, Controls, Picker, Readout } from './Deck'
import '../../styles/algo-graph.css'

// The night map: a small town of lit buildings joined by streets, each
// street marked with its length. The road the running line is looking at
// is drawn in the amber, the roads an algorithm keeps light up in full ink,
// and a place's windows switch on once it has been visited, settled or
// joined. What the algorithm keeps waiting (its queue, stack, heap or
// sorted roads) runs along the strip under the map.

// Two drawings of the same map: wide for a desk, and turned on its side for
// a phone, where the wide one would shrink its names past reading. CSS shows
// one of them, so the prerendered page needs no idea of the screen.
type Sheet = { w: number; h: number; s: number; at: (p: Place) => [number, number]; river: [number, number][] }
const RIVER: [number, number][] = [[790, -20], [770, 120], [758, 250], [770, 360], [792, 470], [762, 560], [740, 660]]
const WIDE: Sheet = { w: 1000, h: 640, s: 1, at: (p) => [p.x, p.y], river: RIVER }
const TALL: Sheet = { w: 640, h: 1010, s: 1.3, at: (p) => [p.y, 40 + p.x], river: RIVER.map(([x, y]) => [y, 40 + x]) }

// A building's size follows its windows: 7 by 8 each, with a little wall round them.
const size = (p: Place) => ({ w: p.cols * 7 + (p.cols - 1) * 4 + 14, h: p.rows * 8 + (p.rows - 1) * 5 + 14 })
const GROUND = 16

// A smooth line through the river's points, curving through the midpoints.
function smooth(pts: [number, number][]) {
  let d = `M${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i], [nx, ny] = pts[i + 1]
    d += ` Q${x} ${y} ${(x + nx) / 2} ${(y + ny) / 2}`
  }
  const [lx, ly] = pts[pts.length - 1]
  return `${d} L${lx} ${ly}`
}

type Lit = 'tree' | 'route' | 'loop'
type MapProps = {
  sheet: Sheet; graph: Graph; state: GraphState; badges: boolean; start: number | null; target: number | null
  route: Set<number>; tap: ((p: number) => void) | null; label: string; tall?: boolean
}

function NightMap({ sheet, graph, state, badges, start, target, route, tap, label, tall }: MapProps) {
  const { s } = sheet
  const pos = graph.places.map(sheet.at)
  const seen = new Set(state.seen)
  const out = new Set(state.out)
  const loop = new Set(state.loop)
  const near = new Set(state.near)
  const tree = new Map(state.tree)
  const lit = (r: number): Lit | undefined => (loop.has(r) ? 'loop' : route.has(r) ? 'route' : tree.has(r) ? 'tree' : undefined)
  const key = (e: KeyboardEvent, p: number) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    tap?.(p)
  }
  const look = state.look && graph.roads[state.look[0]]
  return (
    <svg className={`gm-map gm-map--${tall ? 'tall' : 'wide'}`} viewBox={`0 0 ${sheet.w} ${sheet.h}`} role="group" aria-label={label}>
      <path className="gm-river" d={smooth(sheet.river)} />
      {graph.roads.map((r) => {
        const [ax, ay] = pos[r.a], [bx, by] = pos[r.b]
        // A kept road draws itself in from the place it was reached from.
        const from = tree.get(r.id) ?? r.a
        const [fx, fy] = pos[from], [tx, ty] = pos[from === r.a ? r.b : r.a]
        return (
          <g className="gm-road" key={r.id} data-out={out.has(r.id) && !loop.has(r.id) ? true : undefined} data-near={near.has(r.id) || undefined}>
            <line className="gm-road__bed" x1={ax} y1={ay} x2={bx} y2={by} />
            <line className="gm-road__lane" x1={ax} y1={ay} x2={bx} y2={by} />
            <line className="gm-road__lit" data-lit={lit(r.id)} x1={fx} y1={fy} x2={tx} y2={ty} pathLength={1} />
          </g>
        )
      })}
      {look && state.look && (() => {
        const [fx, fy] = pos[state.look[1]], [tx, ty] = pos[state.look[1] === look.a ? look.b : look.a]
        return <line className="gm-look" key={`${look.id}-${state.look[1]}`} data-bad={state.bad || undefined} x1={fx} y1={fy} x2={tx} y2={ty} pathLength={1} />
      })()}
      {graph.roads.map((r) => {
        const [ax, ay] = pos[r.a], [bx, by] = pos[r.b]
        const on = state.look?.[0] === r.id
        return (
          <g className="gm-len" key={r.id} data-on={on || undefined} data-lit={lit(r.id)} data-out={out.has(r.id) || undefined} transform={`translate(${(ax + bx) / 2} ${(ay + by) / 2}) scale(${s})`}>
            <rect x={-12} y={-11} width={24} height={22} />
            <text y={5}>{r.len}</text>
          </g>
        )
      })}
      {graph.places.map((p) => {
        const [x, y] = pos[p.id]
        const { w, h } = size(p)
        const top = GROUND - h
        const order = state.order[p.id]
        const d = state.dist?.[p.id]
        const was = state.was?.at === p.id ? state.was : undefined
        const flag = state.cur === p.id ? 'cur' : seen.has(p.id) ? 'seen' : undefined
        const live = tap !== null
        return (
          <g
            className="gm-place" key={p.id} transform={`translate(${x} ${y}) scale(${s})`}
            data-flag={flag} data-done={order > 0 || undefined} data-start={start === p.id || undefined} data-target={target === p.id || undefined}
            role={live ? 'button' : undefined} tabIndex={live ? 0 : undefined}
            aria-label={live ? `${p.name}${start === p.id ? ', the start' : ''}` : undefined}
            onClick={live ? () => tap(p.id) : undefined} onKeyDown={live ? (e) => key(e, p.id) : undefined}
          >
            <circle className="gm-place__hit" cx={0} cy={GROUND - h / 2} r={40} />
            <circle className="gm-place__glow" cx={0} cy={GROUND - h / 2} r={38} />
            <rect className="gm-place__ring" x={-w / 2 - 7} y={top - (p.roof ? 17 : 7)} width={w + 14} height={h + (p.roof ? 24 : 14)} />
            {p.roof && <polygon className="gm-place__roof" points={`${-w / 2 - 3},${top} ${w / 2 + 3},${top} 0,${top - 11}`} />}
            <rect className="gm-place__body" x={-w / 2} y={top} width={w} height={h} />
            {Array.from({ length: p.rows }, (_, r) => Array.from({ length: p.cols }, (_, c) => (
              <rect className="gm-place__win" key={`${r}${c}`} x={-w / 2 + 7 + c * 11} y={top + 7 + r * 13} width={7} height={8} data-dim={(p.id * 5 + r * 3 + c) % 4 === 0 || undefined} />
            )))}
            {badges && order > 0 && (
              <g className="gm-place__badge" transform={`translate(${w / 2} ${top})`}>
                <rect x={-11} y={-11} width={22} height={22} />
                <text y={5}>{order}</text>
              </g>
            )}
            {state.dist && (
              <text className="gm-place__dist" y={top - (p.roof ? 22 : 12)} data-new={was ? true : undefined}>
                {was ? <><tspan className="gm-place__was">{was.from === null ? '∞' : was.from} → </tspan>{d}</> : d === null ? '∞' : d}
              </text>
            )}
            <text className="gm-place__name" y={GROUND + 25}>{p.name}</text>
          </g>
        )
      })}
    </svg>
  )
}

export default function GraphMap() {
  const [alg, setAlg] = useState<GraphId>('bfs')
  const [start, setStart] = useState(0)
  const [target, setTarget] = useState<number | null>(null)
  // The first roads are seeded, so the prerendered page and the browser agree.
  const [seed, setSeed] = useState(0)
  const graph = useMemo(() => nightMap(seed === 0 ? seeded(1207) : Math.random), [seed])
  const info = GRAPHS.find((g) => g.id === alg)!
  // Kruskal starts nowhere in particular, so choosing a place never re-runs it.
  const from = info.start ? start : 0
  const frames = useMemo(() => record(RUNS[alg](graph, from)), [alg, graph, from])
  const run = useRun(frames, { initialSpeed: 2 })
  const state = run.frame?.state

  // Once Dijkstra has settled everything, a tap asks for the route there
  // instead of a new start.
  const routing = alg === 'dijkstra' && run.done && frames.length > 1
  const tap = (p: number) => {
    if (routing) { setTarget(p === start ? null : p); return }
    setTarget(null)
    setStart(p)
  }
  const pick = (id: GraphId) => { setTarget(null); setAlg(id) }
  const reroll = () => { setTarget(null); setSeed((x) => x + 1) }

  // The route to the chosen place, walked back along the settled tree.
  const route = new Set<number>()
  let routeNote: string | null = null
  if (routing && target !== null && state) {
    const up = new Map(state.tree.map(([r, f]) => [f === graph.roads[r].a ? graph.roads[r].b : graph.roads[r].a, [r, f]]))
    const stops: string[] = []
    for (let p = target; p !== start && up.has(p);) {
      const [r, f] = up.get(p)!
      route.add(r)
      if (f !== start) stops.push(graph.places[f].name)
      p = f
    }
    stops.reverse()
    const by = stops.length ? `, by way of ${stops.length < 2 ? stops[0] : `${stops.slice(0, -1).join(', ')} and ${stops[stops.length - 1]}`}` : ', by the road straight there'
    routeNote = `${graph.places[start].name} to ${graph.places[target].name}: ${state.dist?.[target]}${by}.`
  }

  const name = graph.places[start].name
  const hint = !info.start
    ? 'Kruskal needs no start: it takes the shortest roads first, wherever they lie.'
    : routing
      ? `Tap a place for the shortest way there from ${name}. Step back to choose a new start.`
      : `Starting from ${name}. Tap a place to start there instead.`
  // Roads draw in at the pace of the steps, never slower than a step lasts.
  const glide = Math.min(420, 900 / SPEEDS[run.speed])
  const label = `${info.name} on the night map, step ${run.i} of ${frames.length - 1}`
  const props = state && {
    graph, state, badges: info.badges, start: info.start ? start : null, target: routing ? target : null,
    route, tap: info.start ? tap : null, label,
  }

  return (
    <div className="viz">
      <div className="viz__main">
        <div className="viz__bar">
          <Picker label="Algorithm" options={GRAPHS.map(({ id, name }) => ({ id, name }))} value={alg} onChange={pick} />
          <div className="viz__tools">
            <Action onClick={reroll}>New roads</Action>
          </div>
        </div>
        <div className="viz__stage gm-stage" style={{ '--gm-glide': `${glide}ms` } as CSSProperties}>
          {props && <NightMap sheet={WIDE} {...props} />}
          {props && <NightMap sheet={TALL} tall {...props} />}
          {state && (
            <div className="gm-dock">
              <span className="gm-dock__name">{state.dock.name}</span>
              {state.dock.chips.length ? (
                <ol className="gm-chips">
                  {state.dock.chips.map((c) => (
                    <li className="gm-chip" key={c.key} data-flag={c.flag}>
                      {c.text}{c.val !== undefined && <span className="gm-chip__val">{c.val}</span>}
                    </li>
                  ))}
                </ol>
              ) : <span className="gm-dock__empty">Empty</span>}
            </div>
          )}
          <p className="viz__hint gm-hint">{hint}</p>
        </div>
        <Controls run={run} label={`${info.name} on the night map`} />
      </div>
      <div className="viz__side">
        <Code lines={info.code} active={run.frame?.line ?? -1} label={info.name} />
        {run.frame && <Readout note={routeNote ?? run.frame.note} counts={run.frame.counts} />}
      </div>
    </div>
  )
}
