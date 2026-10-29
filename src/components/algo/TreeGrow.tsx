import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode, type RefObject } from 'react'
import { record, seeded, useRun, SPEEDS, type Frame } from '../../lib/algo'
import {
  BST_CODE, HEAP_CODE, HEAP_MAX, after, heapOf, idleBst, idleHeap, items, nextId, plant, runBst, runHeap, values,
  type BstOp, type BstState, type Heap, type HeapOp, type HeapState, type Tree,
} from '../../lib/trees'
import { Action, Code, Controls, Picker, Readout } from './Deck'
import '../../styles/algo-tree.css'

// Growing a tree: a binary search tree and a min-heap, drawn as windows on
// a dark stage. A value being inserted or searched for walks down beside
// the node it is compared with; nodes slide to their new places when the
// tree changes shape; a traversal lights the windows in its order while the
// values fill a row beneath. The heap is drawn twice, as the tree and as the
// array it really is, with the same item lit in both.
const MODES = [{ id: 'bst', name: 'Search tree' }, { id: 'heap', name: 'Min-heap' }] as const
type Mode = (typeof MODES)[number]['id']
const WALKS: { id: BstOp; name: string }[] = [
  { id: 'inorder', name: 'In-order' },
  { id: 'preorder', name: 'Pre-order' },
  { id: 'postorder', name: 'Post-order' },
  { id: 'level', name: 'Level order' },
]
const BST_MAX = 24

// Geometry, in CSS pixels: the stage is drawn at its real width so a node is
// the same legible size on a phone as on a desktop. A wide tree on a narrow
// screen keeps its minimum spacing and the stage scrolls sideways instead.
const R = 19 // half a node's side
const LEVEL = 66 // the drop from one depth to the next
const TOP = 40
const PAD = 16
const MIN_SLOT = 28
const MAX_SLOT = 92
const CELL_MIN = 28
const CELL_MAX = 48

// Seven values, seeded so the prerendered page and the browser grow the
// same tree. This seed gives a full-ish tree with one longer branch, and a
// root whose successor sits two steps down: every delete case is in reach.
function seedValues(seed: number, n: number) {
  const r = seeded(seed)
  const out: number[] = []
  while (out.length < n) {
    const v = 5 + Math.floor(r() * 91)
    if (!out.includes(v)) out.push(v)
  }
  return out
}
const FIRST_TREE = plant(seedValues(62558, 8))
const FIRST_HEAP = heapOf(seedValues(4217, 9))

type Spot = { x: number; y: number; parent: number | null }

// Lays a binary tree out: x by in-order position, y by depth. `kids` gives a
// node's children, so the same layout serves the search tree (by id) and the
// heap (by array index).
function place(root: number | null, kids: (k: number) => [number | null, number | null], w: number, minDepth: number) {
  const order: [number, number, number | null][] = []
  const walk = (k: number | null, d: number, p: number | null) => {
    if (k === null) return
    const [l, r] = kids(k)
    walk(l, d + 1, k)
    order.push([k, d, p])
    walk(r, d + 1, k)
  }
  walk(root, 0, null)
  const n = order.length
  const slot = Math.max(MIN_SLOT, Math.min(MAX_SLOT, (w - 2 * PAD) / Math.max(n, 1)))
  const width = Math.max(w, n * slot + 2 * PAD)
  const left = (width - n * slot) / 2
  const depth = order.reduce((m, o) => Math.max(m, o[1]), minDepth)
  const spots = new Map<number, Spot>()
  order.forEach(([k, d, p], i) => spots.set(k, { x: left + (i + 0.5) * slot, y: TOP + d * LEVEL, parent: p }))
  return { spots, width, height: TOP + depth * LEVEL + R + 24, depth }
}

// An edge is a unit line stretched and turned by a CSS transform, so it can
// slide along with the nodes at its ends: SVG line ends cannot transition,
// but a transform can.
function Edge({ from, to, lit }: { from: Spot; to: Spot; lit?: boolean }) {
  const dx = to.x - from.x, dy = to.y - from.y
  return (
    <line
      className="tg-edge" data-lit={lit || undefined} x1={0} y1={0} x2={1} y2={0}
      style={{ transform: `translate(${from.x}px, ${from.y}px) rotate(${Math.atan2(dy, dx)}rad) scaleX(${Math.hypot(dx, dy)})` }}
    />
  )
}

function Node({ x, y, v, flag, done, gone }: { x: number; y: number; v: number; flag?: string; done?: boolean; gone?: boolean }) {
  return (
    <g className="tg-node" data-flag={flag} data-done={done || undefined} data-gone={gone || undefined} style={{ transform: `translate(${x}px, ${y}px)` }}>
      <g className="tg-node__body">
        <rect className="tg-node__box" x={-R} y={-R} width={R * 2} height={R * 2} />
        <text className="tg-node__v" textAnchor="middle" dominantBaseline="central">{v}</text>
      </g>
    </g>
  )
}

// When the stage is wider than the screen, it scrolls to keep the node the
// running line is touching in view (or the root, when nothing is lit).
function useFollow(scroller: RefObject<HTMLDivElement | null>, x: number | undefined) {
  useEffect(() => {
    const el = scroller.current
    if (!el || x === undefined || el.scrollWidth <= el.clientWidth) return
    if (x > el.scrollLeft + 40 && x < el.scrollLeft + el.clientWidth - 40) return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ left: x - el.clientWidth / 2, behavior: still ? 'auto' : 'smooth' })
  }, [scroller, x])
}

function Grove({ s, w, scroller }: { s: BstState; w: number; scroller: RefObject<HTMLDivElement | null> }) {
  const byId = new Map(s.nodes.map((n) => [n.id, n]))
  const { spots, width, height, depth } = place(s.root, (k) => [byId.get(k)!.l, byId.get(k)!.r], w, 3)
  const trail = new Set(s.trail)
  const done = new Set(s.done)
  // Nodes and edges are drawn in id order, never tree order: React moving an
  // element in the DOM would cut its slide short.
  const placed = s.nodes.filter((n) => spots.has(n.id)).sort((a, b) => a.id - b.id)
  const flag = (id: number) => {
    if (id === s.at) return 'at'
    if (id === s.succ) return 'succ'
    if (id === s.mark) return 'mark'
    if (trail.has(id)) return 'trail'
    return undefined
  }
  const probe = s.probe !== undefined && s.at !== undefined ? spots.get(s.at) : undefined
  useFollow(scroller, spots.get(s.at ?? s.root ?? -1)?.x)
  const sorted = placed.slice().sort((a, b) => spots.get(a.id)!.x - spots.get(b.id)!.x).map((n) => n.v)
  return (
    <svg className="tg-svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img"
      aria-label={placed.length ? `A binary search tree of ${placed.length} nodes, height ${Math.max(0, ...[...spots.values()].map((p) => (p.y - TOP) / LEVEL))}. In order: ${sorted.join(', ')}.` : 'An empty binary search tree.'}>
      {Array.from({ length: depth + 1 }, (_, d) => (
        <g className="tg-level" key={d}>
          <line x1={0} x2={width} y1={TOP + d * LEVEL} y2={TOP + d * LEVEL} />
          <text x={8} y={TOP + d * LEVEL - R - 6}>{d === 0 ? 'depth 0' : d}</text>
        </g>
      ))}
      {placed.map((n) => {
        const p = spots.get(n.id)!
        if (p.parent === null) return null
        return <Edge key={n.id} from={spots.get(p.parent)!} to={p} lit={trail.has(n.id) && trail.has(p.parent)} />
      })}
      {placed.map((n) => {
        const p = spots.get(n.id)!
        return <Node key={n.id} x={p.x} y={p.y} v={n.v} flag={flag(n.id)} done={done.has(n.id)} gone={n.id === s.gone} />
      })}
      {probe && (
        <g className="tg-probe" style={{ transform: `translate(${probe.x + R + 4}px, ${probe.y - R - 4}px)` }}>
          <rect x={-13} y={-13} width={26} height={26} />
          <text textAnchor="middle" dominantBaseline="central">{s.probe}</text>
        </g>
      )}
      {placed.length === 0 && <text className="tg-empty" x={width / 2} y={TOP + LEVEL} textAnchor="middle">An empty tree. Insert a value to plant its root.</text>}
    </svg>
  )
}

function Heaped({ s, w, scroller }: { s: HeapState; w: number; scroller: RefObject<HTMLDivElement | null> }) {
  const n = s.a.length
  const kid = (k: number) => (k < n ? k : null)
  const tree = place(n ? 0 : null, (i) => [kid(2 * i + 1), kid(2 * i + 2)], Math.max(w, n * CELL_MIN + 2 * PAD), 3)
  const { spots, width } = tree
  const cell = Math.min(CELL_MAX, (width - 2 * PAD) / Math.max(n, 1))
  const left = (width - n * cell) / 2
  const cx = (i: number) => left + (i + 0.5) * cell
  // Items that move ride a lane above the row, so a swap reads as two items
  // lifting past their neighbours instead of sliding underneath them.
  const lift = Math.round(cell * 0.85)
  const rowY = tree.height + 26 + lift // the top of the array's cells
  const arcY = rowY + cell + 22 // where the arrows leave the cells, below the indices
  const dip = (c: number) => 16 + (c - ((c - 1) >> 1)) * 6
  // Room for the deepest arrow there could be: the last parent to the last child.
  const height = arcY + (n > 1 ? dip(n - 1) : 0) + 20
  const at = new Map(s.a.map((x, i) => [x.id, i]))
  useFollow(scroller, spots.get(s.at ?? 0)?.x)
  const flag = (i: number) => {
    if (s.move?.includes(i)) return 'at'
    if (s.cmp?.includes(i)) return 'trail'
    if (i === s.at) return 'mark'
    return undefined
  }
  const ordered = s.a.slice().sort((p, q) => p.id - q.id)
  const lit = (c: number) => s.par !== undefined && (c === 2 * s.par + 1 || c === 2 * s.par + 2)
  return (
    <svg className="tg-svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img"
      aria-label={n ? `A min-heap of ${n} values. As an array: ${s.a.map((x) => x.v).join(', ')}.` : 'An empty heap.'}>
      <defs>
        <marker id="tg-tip" viewBox="0 0 8 8" refX={7} refY={4} markerWidth={7} markerHeight={7} orient="auto">
          <path d="M0 0 L8 4 L0 8 z" className="tg-tip" />
        </marker>
      </defs>
      {Array.from({ length: n }, (_, i) => {
        const p = spots.get(i)!
        if (p.parent === null) return null
        return <Edge key={i} from={spots.get(p.parent)!} to={p} lit={lit(i) || (s.cmp?.includes(i) && s.cmp.includes(p.parent))} />
      })}
      {ordered.map((x) => {
        const i = at.get(x.id)!
        const p = spots.get(i)!
        return <Node key={x.id} x={p.x} y={p.y} v={x.v} flag={flag(i)} />
      })}

      {n > 0 && <text className="tg-caption" x={left + 1} y={rowY - lift - 12}>The same heap as an array</text>}
      {Array.from({ length: n }, (_, i) => (
        <g key={i} className="tg-slot" style={{ transform: `translate(${cx(i)}px, ${rowY}px)` }}>
          <rect x={-cell / 2 + 1} y={0} width={cell - 2} height={cell} />
          <text className="tg-slot__i" y={cell + 14} textAnchor="middle">{i}</text>
        </g>
      ))}
      {ordered.map((x) => {
        const i = at.get(x.id)!
        return (
          <g key={x.id} className="tg-cell" data-flag={flag(i)} style={{ transform: `translate(${cx(i)}px, ${rowY + cell / 2 - (s.move?.includes(i) ? lift : 0)}px)` }}>
            <rect className="tg-cell__box" x={-cell / 2 + 3} y={-cell / 2 + 3} width={cell - 6} height={cell - 6} />
            <text className="tg-cell__v" textAnchor="middle" dominantBaseline="central">{x.v}</text>
          </g>
        )
      })}
      {/* The parent the running line is looking at points, below the array,
          to its children at 2i+1 and 2i+2: the arithmetic that lets an array
          be a tree. */}
      {s.par !== undefined && [2 * s.par + 1, 2 * s.par + 2].filter((c) => c < n).map((c, k) => {
        const x1 = cx(s.par!), x2 = cx(c), y = arcY, d = dip(c)
        return (
          <g key={c} className="tg-arc">
            <path d={`M${x1} ${y} C${x1} ${y + d}, ${x2} ${y + d}, ${x2} ${y + 3}`} markerEnd="url(#tg-tip)" />
            <text x={x2 + 4} y={y + d * 0.75 + 12} textAnchor="middle">2·{s.par}+{k + 1}</text>
          </g>
        )
      })}
      {n === 0 && <text className="tg-empty" x={width / 2} y={TOP + LEVEL} textAnchor="middle">An empty heap. Push a value.</text>}
    </svg>
  )
}

// The row under the stage: what a traversal has output so far, the queue
// level order keeps, or the value an extract took; a quiet hint otherwise.
function Tray({ label, vals, queue, hint }: { label: string; vals?: number[]; queue?: number[]; hint: string }) {
  if (!vals) return <div className="tg-tray"><p className="tg-tray__hint">{hint}</p></div>
  return (
    <div className="tg-tray">
      <div className="tg-tray__row">
        <span className="tg-tray__name">{label}</span>
        <ol className="tg-tray__vals" aria-label={label}>
          {vals.map((v, k) => <li key={k} className="tg-tray__v" data-new={k === vals.length - 1 || undefined}>{v}</li>)}
        </ol>
      </div>
      {queue && (
        <div className="tg-tray__row">
          <span className="tg-tray__name">Queue</span>
          <ol className="tg-tray__vals" aria-label="Queue">
            {queue.map((v, k) => <li key={k} className="tg-tray__v tg-tray__v--wait">{v}</li>)}
          </ol>
        </div>
      )}
    </div>
  )
}

// The stage is drawn at its measured width; until it is measured (and in
// the prerendered page) it assumes a desktop width.
function useWidth(fallback: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(fallback)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

function Field({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className="tg-field">
      <span className="tg-field__name">{label}</span>
      <input className="tg-field__input" type="number" inputMode="numeric" min={1} max={99} step={1} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

function Ops({ children, label, onSubmit }: { children: ReactNode; label: string; onSubmit?: (e: FormEvent) => void }) {
  return onSubmit
    ? <form className="tg-ops" aria-label={label} onSubmit={onSubmit}>{children}</form>
    : <div className="tg-ops" role="group" aria-label={label}>{children}</div>
}

type BstRec = { op: BstOp; frames: Frame<BstState>[]; tree: Tree }
type HeapRec = { op: HeapOp; frames: Frame<HeapState>[]; heap: Heap }

export default function TreeGrow() {
  const [mode, setMode] = useState<Mode>('bst')
  const [text, setText] = useState('42')
  const [bst, setBst] = useState<BstRec>(() => ({
    op: 'insert', tree: FIRST_TREE,
    frames: [idleBst(FIRST_TREE, 'Eight values, planted one by one. Smaller values hang to the left of every node, bigger ones to the right.')],
  }))
  const [heap, setHeap] = useState<HeapRec>(() => ({
    op: 'push', heap: FIRST_HEAP,
    frames: [idleHeap(FIRST_HEAP, 'Nine values in a min-heap. Every parent is no bigger than its children, so the smallest sits at the root.')],
  }))
  // Each mode keeps its own place in its own recording.
  const bstRun = useRun(bst.frames, { autoplay: true, initialSpeed: 2 })
  const heapRun = useRun(heap.frames, { autoplay: true, initialSpeed: 2 })
  const [stage, w] = useWidth(760)

  const num = Number(text)
  const valid = text.trim() !== '' && Number.isInteger(num) && num >= 1 && num <= 99
  const vals = values(bst.tree)
  const full = vals.length >= BST_MAX

  // An operation runs on the tree the last one left behind, recorded whole,
  // and plays from its first step.
  const doBst = (op: BstOp, v = 0) => {
    const frames = record(runBst(bst.tree, op, v))
    setBst({ op, frames, tree: after(frames) })
  }
  const doHeap = (op: HeapOp, v = 0, from?: Heap) => {
    const frames = record(runHeap(from ?? heap.heap, op, v))
    setHeap({ op, frames, heap: frames[frames.length - 1].state.a })
  }
  const randomFree = () => {
    const free = Array.from({ length: 99 }, (_, k) => k + 1).filter((v) => !vals.includes(v))
    return free[Math.floor(Math.random() * free.length)]
  }
  const newTree = () => {
    const tree = plant(seedValues(Math.floor(Math.random() * 2147483646) + 1, 8), bst.tree.next)
    setBst({ op: 'insert', tree, frames: [idleBst(tree, 'A new tree of eight random values.')] })
  }

  const heapifyRandom = () => {
    const size = 9 + Math.floor(Math.random() * 3)
    doHeap('heapify', 0, items(Array.from({ length: size }, () => 1 + Math.floor(Math.random() * 99)), nextId(heap.heap)))
  }

  const onBst = (e: FormEvent) => { e.preventDefault(); if (valid && !full) doBst('insert', num) }
  const onHeap = (e: FormEvent) => { e.preventDefault(); if (valid && heap.heap.length < HEAP_MAX) doHeap('push', num) }

  const bs = bstRun.frame?.state
  const hs = heapRun.frame?.state
  const run = mode === 'bst' ? bstRun : heapRun
  const glide = Math.min(560, 1500 / SPEEDS[run.speed])

  return (
    <div className="viz">
      <div className="viz__main">
        <div className="viz__bar">
          <Picker label="Tree" options={[...MODES]} value={mode} onChange={setMode} />
          <div className="viz__tools">
            {mode === 'bst' ? (
              <>
                <Action onClick={() => doBst('sorted')}>Plant sorted</Action>
                <Action onClick={newTree}>New tree</Action>
              </>
            ) : (
              <Action onClick={heapifyRandom}>Heapify random</Action>
            )}
          </div>
        </div>
        {mode === 'bst' ? (
          <div className="tg-opsrow">
            <Ops label="Insert, search or delete a value" onSubmit={onBst}>
              <Field value={text} onChange={setText} label="Value" />
              <button type="submit" className="act act--primary" disabled={!valid || full}>Insert</button>
              <Action onClick={() => { const v = randomFree(); setText(String(v)); doBst('insert', v) }} disabled={full}>Random</Action>
              <Action onClick={() => doBst('search', num)} disabled={!valid}>Search</Action>
              <Action onClick={() => doBst('delete', num)} disabled={!valid}>Delete</Action>
            </Ops>
            <Ops label="Walk the tree">
              <span className="tg-ops__name">Walk</span>
              {WALKS.map((t) => <Action key={t.id} onClick={() => doBst(t.id)} disabled={!vals.length}>{t.name}</Action>)}
            </Ops>
          </div>
        ) : (
          <div className="tg-opsrow">
            <Ops label="Push or extract" onSubmit={onHeap}>
              <Field value={text} onChange={setText} label="Value" />
              <button type="submit" className="act act--primary" disabled={!valid || heap.heap.length >= HEAP_MAX}>Push</button>
              <Action onClick={() => { const v = 1 + Math.floor(Math.random() * 99); setText(String(v)); doHeap('push', v) }} disabled={heap.heap.length >= HEAP_MAX}>Random</Action>
              <Action onClick={() => doHeap('pop')} disabled={!heap.heap.length}>Extract min</Action>
            </Ops>
          </div>
        )}
        <div className="viz__stage tg-stage" style={{ '--tg-glide': `${glide}ms` } as CSSProperties}>
          <div className="tg-scroll" ref={stage}>
            {mode === 'bst' ? bs && <Grove s={bs} w={w} scroller={stage} /> : hs && <Heaped s={hs} w={w} scroller={stage} />}
          </div>
          {mode === 'bst'
            ? <Tray label="Output" vals={bs?.out} queue={bs?.queue?.map((id) => bs.nodes.find((n) => n.id === id)!.v)} hint="Walk the tree to read its values out, one node at a time." />
            : <Tray label="Taken" vals={hs?.taken !== undefined ? [hs.taken] : undefined} hint="Extract the min to take the smallest value out of the heap." />}
        </div>
        {mode === 'bst' ? <Controls run={bstRun} label="Binary search tree" /> : <Controls run={heapRun} label="Min-heap" />}
      </div>
      <div className="viz__side">
        {mode === 'bst' ? (
          <>
            <Code lines={BST_CODE[bst.op]} active={bstRun.frame?.line ?? -1} label="The search tree operation" />
            {bstRun.frame && <Readout note={bstRun.frame.note} counts={bstRun.frame.counts} />}
          </>
        ) : (
          <>
            <Code lines={HEAP_CODE[heap.op]} active={heapRun.frame?.line ?? -1} label="The heap operation" />
            {heapRun.frame && <Readout note={heapRun.frame.note} counts={heapRun.frame.counts} />}
          </>
        )}
      </div>
    </div>
  )
}
