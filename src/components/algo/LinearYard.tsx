import { Dices } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type RefObject } from 'react'
import { record, seeded, useRun, SPEEDS, type Frame } from '../../lib/algo'
import {
  LIST_CAP, LIST_CODE, LIST_RUNS, QUEUE_CAP, QUEUE_CODE, QUEUE_RUNS, STACK_CAP, STACK_CODE, STACK_RUNS,
  listIdle, queueIdle, seedList, seedQueue, seedStack, stackIdle,
  type Item, type ListData, type ListOp, type ListState, type Ptr, type QueueData, type QueueOp, type QueueState,
  type StackData, type StackOp, type StackState,
} from '../../lib/linear'
import { Action, Code, Controls, Picker, Readout } from './Deck'
import '../../styles/algo-linear.css'

// Stacks, queues and lists, drawn as things in the night town: records piled
// on a spindle, a line at the cinema booth with the ring buffer that holds
// it, and a string of lamps joined by wires. Each operation is recorded as
// frames, so the pointers can be watched moving one line of code at a time.
type Mode = 'stack' | 'queue' | 'list'
const MODES: { id: Mode; name: string }[] = [{ id: 'stack', name: 'Stack' }, { id: 'queue', name: 'Queue' }, { id: 'list', name: 'Linked list' }]

// The starting structures are seeded, so the prerendered page and the browser agree.
const STACK0 = seedStack(seeded(808))
const QUEUE0 = seedQueue(seeded(1951))
const LIST0 = seedList(seeded(4040))

const keepStack = (s: StackState): StackData => ({ items: s.items, seq: s.seq })
const keepQueue = (s: QueueState): QueueData => ({ buf: s.buf, head: s.head, tail: s.tail, size: s.size, seq: s.seq })
const keepList = (s: ListState): ListData => ({ nodes: s.nodes, seq: s.seq })

// One structure on the bench: what it holds once the last operation has
// finished, that operation's recording, and its name (for the code panel).
// A new operation always starts from the finished structure, so pressing a
// button mid-animation skips the rest of the last one.
function useBench<D, S, O extends string>(start: D, idle: (d: D) => Frame<S>, keep: (s: S) => D, first: O) {
  const [data, setData] = useState(start)
  const [frames, setFrames] = useState(() => [idle(start)])
  const [op, setOp] = useState<O>(first)
  const run = useRun(frames, { autoplay: true, initialSpeed: 2 })
  const play = (name: O, gen: Generator<Frame<S>, void>) => {
    const recorded = record(gen)
    setOp(name)
    setFrames(recorded)
    setData(keep(recorded[recorded.length - 1].state))
  }
  return { data, op, run, play }
}

// The stage is drawn in one of two layouts: wide, and a narrow one with
// larger type for phones. The prerendered page is always wide; the stage's
// own width decides once the page is running.
function useNarrow(ref: RefObject<HTMLElement | null>, below = 600) {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setNarrow(e.contentRect.width < below))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, below])
  return narrow
}

// Slides keep up with the speed: unhurried at the default, quick when fast.
const glide = (speed: number) => ({ '--glide': `${Math.round(Math.min(480, 1500 / SPEEDS[speed]))}ms` }) as CSSProperties
const at = (x: number, y: number): CSSProperties => ({ transform: `translate(${x}px, ${y}px)` })
const random99 = () => 1 + Math.floor(Math.random() * 99)

// A refusal (overflow, underflow, full, empty) written on the stage.
function Banner({ x, y, text, anchor = 'start' }: { x: number; y: number; text?: string; anchor?: 'start' | 'middle' }) {
  if (!text) return null
  return <text className="ly-banner" x={x} y={y} textAnchor={anchor}>{text}</text>
}

/* ---------- The stack: records on a spindle ---------- */

// A record seen from a little above: its face, the edge below it, two
// grooves, and the label in the middle with its value.
function Disc({ rx, v }: { rx: number; v: number }) {
  const ry = 9, t = 6
  return (
    <>
      <path className="ly-rec__edge" d={`M ${-rx} 0 L ${-rx} ${t} A ${rx} ${ry} 0 0 0 ${rx} ${t} L ${rx} 0 A ${rx} ${ry} 0 0 1 ${-rx} 0 Z`} />
      <ellipse className="ly-rec__face" rx={rx} ry={ry} />
      {rx > 60 && [0.86, 0.66].map((k) => <ellipse key={k} className="ly-rec__groove" rx={rx * k} ry={ry * k} />)}
      <ellipse className="ly-rec__label" rx={25} ry={7.5} />
      <text className="ly-rec__value" x={0} y={0.5}>{v}</text>
    </>
  )
}

function StackStage({ s, narrow, label }: { s: StackState; narrow: boolean; label: string }) {
  const W = narrow ? 400 : 640
  const SX = narrow ? 210 : 290 // the spindle
  const RX = narrow ? 84 : 108
  const PITCH = 30, BASE = 368, TIP = 112, HOVER = 74
  const slotY = (k: number) => BASE - 17 - k * PITCH // the centre of a record's face
  const TX = narrow ? 350 : 540 // the tray for a popped record
  const TRX = narrow ? 40 : 76
  const left = SX - RX
  const pos = new Map<number, { x: number; y: number; rx: number; slot?: number }>()
  s.items.forEach((r, k) => pos.set(r.id, { x: SX, y: slotY(k), rx: RX, slot: k }))
  if (s.hover) pos.set(s.hover.id, { x: SX, y: HOVER, rx: RX })
  if (s.out) pos.set(s.out.id, { x: TX, y: BASE - 17, rx: TRX })
  const all = [...s.items, ...(s.hover ? [s.hover] : []), ...(s.out ? [s.out] : [])].sort((a, b) => a.id - b.id)
  return (
    <svg className="ly-svg ly-svg--stack" viewBox={`0 0 ${W} 400`} role="img" aria-label={label}>
      <Banner x={SX} y={34} text={s.error} anchor="middle" />
      <rect className="ly-spindle" x={SX - 3} y={TIP} width={6} height={BASE - TIP} />
      <circle className="ly-spindle" cx={SX} cy={TIP} r={3} />
      {Array.from({ length: STACK_CAP }, (_, k) => (
        <g key={k}>
          {k >= s.items.length && <ellipse className="ly-ghost" cx={SX} cy={slotY(k)} rx={RX - 0.5} ry={8.5} />}
          <text className="ly-index" x={left - 14} y={slotY(k) + 2} textAnchor="end">{k}</text>
        </g>
      ))}
      <rect className="ly-platter" x={SX - RX - 20} y={BASE} width={RX * 2 + 40} height={8} />
      <rect className="ly-plinth" x={SX - RX - 44} y={BASE + 8} width={RX * 2 + 88} height={16} />
      {all.map((r) => {
        const p = pos.get(r.id)!
        const lit = r.id === s.hover?.id || (p.slot !== undefined && p.slot === s.lit) || (r.id === s.out?.id && s.outLit)
        return (
          <g key={r.id} className="ly-rec" style={at(p.x, p.y)} data-lit={lit || undefined} data-out={(r.id === s.out?.id && !s.outLit) || undefined} data-error={(s.error && r.id === s.hover?.id) || undefined}>
            <g className="ly-rec__body"><Disc rx={p.rx} v={r.v} /></g>
          </g>
        )
      })}
      {s.out && <text className="ly-note" x={TX} y={BASE - 46}>returned</text>}
      <g className="ly-ptr" style={at(0, slotY(s.top) + 2)} data-lit={s.ptr || undefined}>
        <text className="ly-ptr__name" x={left - 70} y={0} textAnchor="end">top</text>
        <line className="ly-ptr__line" x1={left - 64} x2={left - 36} y1={0} y2={0} />
        <path className="ly-ptr__head" d={`M ${left - 36} -5 L ${left - 28} 0 L ${left - 36} 5 Z`} />
      </g>
    </svg>
  )
}

/* ---------- The queue: a line at the cinema, and its ring buffer ---------- */

// A slot of the ring: an arc of the annulus between r0 and r1, slot 0 at the top.
function sector(i: number, r0: number, r1: number) {
  const rad = (d: number) => (d * Math.PI) / 180
  const a0 = rad(-90 + i * 45 - 22.5 + 2), a1 = rad(-90 + i * 45 + 22.5 - 2)
  const p = (r: number, a: number) => `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`
  return `M ${p(r1, a0)} A ${r1} ${r1} 0 0 1 ${p(r1, a1)} L ${p(r0, a1)} A ${r0} ${r0} 0 0 0 ${p(r0, a0)} Z`
}

function Person({ p, x, y, w, ticket, flag }: { p: Item; x: number; y: number; w: number; ticket?: boolean; flag?: string }) {
  // Heights vary a little by id, so the line reads as people, not boxes.
  const h = 38 + ((p.id * 5) % 4) * 3
  return (
    <g className="ly-person" style={at(x, y)} data-flag={flag}>
      <circle className="ly-person__head" cx={0} cy={-h - 12} r={9} />
      <rect className="ly-person__body" x={-w / 2} y={-h} width={w} height={h} />
      <text className="ly-person__value" x={0} y={-h / 2}>{p.v}</text>
      {ticket && <rect className="ly-ticket" x={-w / 2 - 15} y={-h + 8} width={16} height={10} />}
    </g>
  )
}

function QueueStage({ s, narrow, label }: { s: QueueState; narrow: boolean; label: string }) {
  const L = narrow
    ? { W: 400, H: 600, gy: 212, booth: [8, 82, 66, 130], win: [16, 118, 50, 34], sign: [41, 104], x0: 108, step: 38, serve: 88, enter: 396, pw: 26, ring: [200, 420], R: 104, r: 64 }
    : { W: 960, H: 360, gy: 262, booth: [24, 112, 100, 150], win: [40, 150, 68, 44], sign: [74, 136], x0: 178, step: 52, serve: 146, enter: 604, pw: 28, ring: [794, 180], R: 112, r: 70 }
  const [bx, by, bw, bh] = L.booth
  const [wx, wy, ww, wh] = L.win
  const [cx, cy] = L.ring
  // The line is the buffer read from head round to tail; a slot just
  // emptied leaves no gap, so everyone behind steps forward at once.
  const line: Item[] = []
  for (let k = 0; k < QUEUE_CAP; k++) {
    const p = s.buf[(s.head + k) % QUEUE_CAP]
    if (p && p.id !== s.serving?.id) line.push(p)
  }
  const ahead = s.serving ? 1 : 0 // the one at the window still holds their place
  const people: { p: Item; x: number; y: number; flag?: string; ticket?: boolean }[] = line.map((p, k) => ({ p, x: L.x0 + (k + ahead) * L.step, y: L.gy }))
  if (s.arriving) people.push({ p: s.arriving, x: L.enter, y: L.gy, flag: s.error ? 'turned' : 'arriving' })
  if (s.serving) people.push({ p: s.serving, x: L.serve, y: L.gy, flag: 'serving', ticket: true })
  if (s.leaving) people.push({ p: s.leaving, x: L.serve + 10, y: L.gy - 70, flag: 'leaving', ticket: true })
  people.sort((a, b) => a.p.id - b.p.id)
  const size = line.length + ahead
  const mid = (L.R + L.r) / 2
  const polar = (i: number, r: number) => {
    const a = ((-90 + i * 45) * Math.PI) / 180
    return { x: r * Math.cos(a), y: r * Math.sin(a) }
  }
  const turn = (n: number) => ({ transform: `rotate(${n * 45}deg)` })
  const upright = (n: number) => ({ transform: `rotate(${-n * 45}deg)` })
  return (
    <svg className="ly-svg ly-svg--queue" viewBox={`0 0 ${L.W} ${L.H}`} role="img" aria-label={label}>
      <Banner x={narrow ? 16 : 24} y={narrow ? 36 : 56} text={s.error} />
      <rect className="ly-ground" x={narrow ? 0 : 12} y={L.gy} width={narrow ? L.W : L.enter + 20} height={2} />
      <rect className="ly-booth" x={bx} y={by} width={bw} height={bh} />
      <rect className="ly-booth__awning" x={bx - 6} y={by - 12} width={bw + 12} height={12} />
      <text className="ly-booth__sign" x={L.sign[0]} y={L.sign[1]} textAnchor="middle">TICKETS</text>
      <rect className="ly-booth__window" x={wx} y={wy} width={ww} height={wh} data-lit={s.serving ? true : undefined} />
      <rect className="ly-booth__ledge" x={wx - 6} y={wy + wh} width={ww + 12} height={4} />
      {people.map(({ p, x, y, flag, ticket }) => <Person key={p.id} p={p} x={x} y={y} w={L.pw} flag={flag} ticket={ticket} />)}
      {size > 0 && <text className="ly-note" x={L.x0} y={L.gy + 22} textAnchor="middle">{size > 1 ? 'front' : 'front, back'}</text>}
      {size > 1 && <text className="ly-note ly-slide" style={at(L.x0 + (size - 1) * L.step, L.gy + 22)} x={0} y={0} textAnchor="middle">back</text>}

      <g transform={`translate(${cx} ${cy})`}>
        {s.buf.map((p, i) => {
          const c = polar(i, mid), d = polar(i, L.R + 13)
          return (
            <g key={i}>
              <path className="ly-slot" d={sector(i, L.r, L.R)} data-full={p ? true : undefined} data-lit={s.lit === i || undefined} />
              {p && <text className="ly-slot__value" x={c.x} y={c.y}>{p.v}</text>}
              <text className="ly-index" x={d.x} y={d.y} textAnchor="middle">{i}</text>
            </g>
          )
        })}
        <text className="ly-note" x={0} y={0} textAnchor="middle" dominantBaseline="central">buf</text>
        <g className="ly-mark" style={turn(s.head)} data-lit={s.ptr === 'head' || undefined}>
          <path className="ly-mark__head" d={`M -6 ${-(L.R + 30)} L 6 ${-(L.R + 30)} L 0 ${-(L.R + 20)} Z`} />
          <g transform={`translate(0 ${-(L.R + 42)})`}><text className="ly-mark__name" style={upright(s.head)}>head</text></g>
        </g>
        <g className="ly-mark" style={turn(s.tail)} data-lit={s.ptr === 'tail' || undefined}>
          <path className="ly-mark__head" d={`M -6 ${-(L.r - 12)} L 6 ${-(L.r - 12)} L 0 ${-(L.r - 3)} Z`} />
          <g transform={`translate(0 ${-(L.r - 24)})`}><text className="ly-mark__name" style={upright(s.tail)}>tail</text></g>
        </g>
      </g>
    </svg>
  )
}

/* ---------- The linked list: a string of lamps ---------- */

// The list is laid out along an axis: left to right when wide, top to bottom
// on a phone. Positions are worked out as (along, across) and mapped to the
// page at the end, so one drawing serves both.
type Pt = [number, number]

function ListStage({ s, narrow, label }: { s: ListState; narrow: boolean; label: string }) {
  const G = narrow
    ? { W: 320, H: 562, SP: 58, R: 18, ox: 150, oy: 92, OFF: 92 }
    : { W: 920, H: 236, SP: 96, R: 24, ox: 140, oy: 152, OFF: 98 }
  const { SP, R } = G
  const map = ([a, c]: Pt): Pt => (narrow ? [G.ox + c, G.oy + a] : [G.ox + a, G.oy + c])
  const f = (n: number) => n.toFixed(1)
  const pt = (p: Pt) => { const [x, y] = map(p); return `${f(x)} ${f(y)}` }
  const where = new Map<number, Pt>()
  s.nodes.forEach((n, k) => where.set(n.id, [k * SP, n.id === s.off ? -G.OFF : 0]))
  const last = s.nodes.length - 1
  const ptrAt = (p: Ptr): Pt => (p === 'start' ? [-0.5 * SP, 0] : p === 'end' ? [(last + 0.6) * SP, 0] : where.get(p)!)
  const box: Pt = [-0.95 * SP, -62]

  // A wire as one cubic from p's centre to q's edge, bowed to one side: a
  // forward wire sags, a turned one arches the other way. Every wire has the
  // same shape of path, so a rewire can slide from one end to the other.
  const wire = (p: Pt, q: Pt, sign = 1) => {
    const da = q[0] - p[0], dc = q[1] - p[1]
    const len = Math.hypot(da, dc) || 1
    const ua = da / len, uc = dc / len
    const end: Pt = [q[0] - ua * (R + 3), q[1] - uc * (R + 3)]
    const bend = sign * (6 + len * 0.08)
    const c1: Pt = [p[0] + da / 3 - uc * bend, p[1] + dc / 3 + ua * bend]
    const c2: Pt = [p[0] + (2 * da) / 3 - uc * bend, p[1] + (2 * dc) / 3 + ua * bend]
    return `M ${pt(p)} C ${pt(c1)} ${pt(c2)} ${pt(end)}`
  }
  // A wire to null ends in the ground sign. It points away from the string:
  // past the last lamp, or before the first once reverse has turned it.
  const ground = (from: Pt, dir: number) => {
    const a = from[0] + dir * 0.46 * SP
    const bars = [9, 6, 3].map((h, k) => `M ${pt([a + dir * k * 3.5, from[1] - h])} L ${pt([a + dir * k * 3.5, from[1] + h])}`).join(' ')
    return { d: `M ${pt(from)} L ${pt([a, from[1]])} ${bars}`, text: map([a + dir * 3.5, from[1] + (narrow ? 14 : 22)]), anchor: narrow ? 'start' as const : 'middle' as const }
  }
  const tagCount = new Map<string, number>()
  const order = [...s.nodes].sort((a, b) => a.id - b.id)
  const headLamp = s.head === null ? undefined : where.get(s.head)
  const [hx, hy] = map(box)
  return (
    <svg className="ly-svg ly-svg--list" viewBox={`0 0 ${G.W} ${G.H}`} role="img" aria-label={label}>
      <defs>
        <radialGradient id="ly-glow">
          <stop className="ly-glow-stop" offset="0.45" stopOpacity={0.5} />
          <stop className="ly-glow-stop" offset="1" stopOpacity={0} />
        </radialGradient>
        <marker id="ly-arrow" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={9} markerHeight={9} markerUnits="userSpaceOnUse" orient="auto">
          <path className="ly-arrow" d="M 0 1 L 10 5 L 0 9 Z" />
        </marker>
        <marker id="ly-arrow-lit" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={11} markerHeight={11} markerUnits="userSpaceOnUse" orient="auto">
          <path className="ly-arrow ly-arrow--lit" d="M 0 1 L 10 5 L 0 9 Z" />
        </marker>
      </defs>
      <Banner x={narrow ? 12 : 16} y={narrow ? 20 : 26} text={s.error} />
      {order.map((n) => {
        const to = s.next[n.id]
        const p = where.get(n.id)!
        const lit = s.wire === n.id
        if (to === null || to === undefined) {
          const k = s.nodes.indexOf(n)
          const dir = n.id !== s.off && k !== last ? -1 : 1
          const g = ground(p, dir)
          // A pointer tag at this end already says null; the sign need not repeat it.
          const said = s.tags.some((t) => t.at === (dir < 0 ? 'start' : 'end'))
          return (
            <g key={`w${n.id}`} className="ly-null" data-lit={lit || undefined} data-gone={(s.gone && n.id === s.off) || undefined}>
              <path className="ly-null__line" d={g.d} />
              {!said && <text className="ly-null__text" x={g.text[0]} y={g.text[1]} textAnchor={g.anchor}>null</text>}
            </g>
          )
        }
        return <path key={`w${n.id}`} className="ly-wire" d={wire(p, where.get(to)!)} markerEnd={`url(#${lit ? 'ly-arrow-lit' : 'ly-arrow'})`} data-lit={lit || undefined} data-gone={(s.gone && n.id === s.off) || undefined} />
      })}
      {headLamp
        ? <path key="head" className="ly-wire" d={wire(box, headLamp, -1)} markerEnd={`url(#${s.wire === 'head' ? 'ly-arrow-lit' : 'ly-arrow'})`} data-lit={s.wire === 'head' || undefined} />
        : (() => { const g = ground([box[0] + 0.3 * SP, box[1]], 1); return <g className="ly-null"><path className="ly-null__line" d={g.d} /><text className="ly-null__text" x={g.text[0]} y={g.text[1]} textAnchor={g.anchor}>null</text></g> })()}
      {order.map((n) => {
        const [x, y] = map(where.get(n.id)!)
        const k = s.nodes.indexOf(n)
        const cap = narrow ? { x: -(R + 8), y: -6, width: 7, height: 12 } : { x: -6, y: -(R + 8), width: 12, height: 7 }
        const idx = narrow ? { x: -(R + 14), y: 0, textAnchor: 'end' as const } : { x: 0, y: -(R + 16), textAnchor: 'middle' as const }
        return (
          <g key={n.id} className="ly-lamp" style={at(x, y)} data-lit={s.lit === n.id || undefined} data-seen={(s.lit !== n.id && s.seen.includes(n.id)) || undefined} data-gone={(s.gone && n.id === s.off) || undefined}>
            <circle className="ly-lamp__glow" r={R * 2.1} fill="url(#ly-glow)" />
            <rect className="ly-lamp__cap" {...cap} />
            <circle className="ly-lamp__glass" r={R} />
            <text className="ly-lamp__value" x={0} y={0}>{n.v}</text>
            {n.id !== s.off && <text className="ly-index" {...idx}>{k}</text>}
          </g>
        )
      })}
      <g className="ly-headbox" data-lit={s.wire === 'head' || undefined}>
        <rect x={hx - 26} y={hy - 13} width={52} height={26} />
        <text x={hx} y={hy}>head</text>
      </g>
      {s.tags.map((t) => {
        const key = String(t.at)
        const k = tagCount.get(key) ?? 0
        tagCount.set(key, k + 1)
        const [x, y] = map(ptrAt(t.at))
        const nil = t.at === 'start' || t.at === 'end'
        return (
          <g key={t.name} className="ly-tag ly-slide" style={at(x, y)} data-null={nil || undefined}>
            {narrow
              ? <>
                  <path className="ly-tag__caret" d={`M ${R + 5} 0 L ${R + 12} -5 L ${R + 12} 5 Z`} />
                  <text className="ly-tag__name" x={R + 16 + k * 44} y={0} textAnchor="start">{t.name}{nil ? ' = null' : ''}</text>
                </>
              : <>
                  <path className="ly-tag__caret" d={`M 0 ${R + 6} L -5 ${R + 13} L 5 ${R + 13} Z`} />
                  <text className="ly-tag__name" x={0} y={R + 26 + k * 16} textAnchor="middle">{t.name}</text>
                  {nil && <text className="ly-tag__nil" x={0} y={R + 42 + k * 16} textAnchor="middle">null</text>}
                </>}
          </g>
        )
      })}
    </svg>
  )
}

/* ---------- The bench ---------- */

export default function LinearYard() {
  const [mode, setMode] = useState<Mode>('stack')
  const [value, setValue] = useState('42')
  const [index, setIndex] = useState('2')
  const stageRef = useRef<HTMLDivElement>(null)
  const narrow = useNarrow(stageRef)
  const stack = useBench<StackData, StackState, StackOp>(STACK0, stackIdle, keepStack, 'push')
  const queue = useBench<QueueData, QueueState, QueueOp>(QUEUE0, queueIdle, keepQueue, 'enqueue')
  const list = useBench<ListData, ListState, ListOp>(LIST0, listIdle, keepList, 'insert')

  // An empty or out-of-range value rolls a fresh one rather than refusing.
  const num = () => { const n = Math.round(Number(value)); return value !== '' && n >= 1 && n <= 99 ? n : random99() }
  const reroll = () => setValue(String(random99()))
  const n = list.data.nodes.length
  const idx = (hi: number) => { const k = Math.round(Number(index)); return Math.max(0, Math.min(hi, Number.isFinite(k) ? k : 0)) }

  const ops: Record<Mode, { name: string; run: () => void }[]> = {
    stack: [
      { name: 'Push', run: () => { stack.play('push', STACK_RUNS.push(stack.data, num())); reroll() } },
      { name: 'Pop', run: () => stack.play('pop', STACK_RUNS.pop(stack.data)) },
      { name: 'Peek', run: () => stack.play('peek', STACK_RUNS.peek(stack.data)) },
    ],
    queue: [
      { name: 'Enqueue', run: () => { queue.play('enqueue', QUEUE_RUNS.enqueue(queue.data, num())); reroll() } },
      { name: 'Dequeue', run: () => queue.play('dequeue', QUEUE_RUNS.dequeue(queue.data)) },
    ],
    list: [
      { name: 'Insert', run: () => { const i = idx(n); setIndex(String(i)); list.play('insert', LIST_RUNS.insert(list.data, i, num())); reroll() } },
      { name: 'Delete', run: () => { const i = idx(Math.max(0, n - 1)); setIndex(String(i)); list.play('delete', LIST_RUNS.delete(list.data, i)) } },
      { name: 'Search', run: () => list.play('search', LIST_RUNS.search(list.data, num())) },
      { name: 'Reverse', run: () => list.play('reverse', LIST_RUNS.reverse(list.data)) },
    ],
  }
  // Enter in a field runs the first operation: push, enqueue or insert.
  const enter = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); ops[mode][0].run() } }

  const sf = stack.run.frame, qf = queue.run.frame, lf = list.run.frame
  const say = {
    stack: sf && `Stack of ${sf.state.items.length} records, bottom to top: ${sf.state.items.map((r) => r.v).join(', ') || 'none'}. top is ${sf.state.top}.`,
    queue: qf && `Queue of ${qf.state.size}, head at slot ${qf.state.head % QUEUE_CAP}, tail at slot ${qf.state.tail % QUEUE_CAP}. Slots: ${qf.state.buf.map((p) => p?.v ?? 'empty').join(', ')}.`,
    list: lf && `Linked list of ${lf.state.nodes.length} lamps: ${lf.state.nodes.map((l) => l.v).join(', ') || 'none'}.`,
  }

  return (
    <div className="viz ly-yard">
      <div className="viz__main">
        <div className="viz__bar">
          <Picker label="Structure" options={MODES} value={mode} onChange={setMode} />
          <div className="viz__tools ly-tools">
            <div className="ly-fields">
              <label className="ly-field">
                <span className="ly-field__name">Value</span>
                <input className="ly-field__input" type="number" inputMode="numeric" min={1} max={99} value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={enter} />
              </label>
              <button type="button" className="ly-dice" onClick={reroll} aria-label="Pick a random value"><Dices size={20} strokeWidth={1.75} aria-hidden="true" /></button>
              {mode === 'list' && (
                <label className="ly-field">
                  <span className="ly-field__name">Index</span>
                  <input className="ly-field__input" type="number" inputMode="numeric" min={0} max={Math.min(n, LIST_CAP - 1)} value={index} onChange={(e) => setIndex(e.target.value)} onKeyDown={enter} />
                </label>
              )}
            </div>
            <div className="ly-ops" role="group" aria-label="Operations">
              {ops[mode].map((o) => <Action key={o.name} onClick={o.run}>{o.name}</Action>)}
            </div>
          </div>
        </div>
        <div className="viz__stage ly-stage" ref={stageRef} data-mode={mode}>
          {mode === 'stack' && sf && <div style={glide(stack.run.speed)}><StackStage s={sf.state} narrow={narrow} label={say.stack!} /></div>}
          {mode === 'queue' && qf && <div style={glide(queue.run.speed)}><QueueStage s={qf.state} narrow={narrow} label={say.queue!} /></div>}
          {mode === 'list' && lf && <div style={glide(list.run.speed)}><ListStage s={lf.state} narrow={narrow} label={say.list!} /></div>}
        </div>
        {mode === 'stack' && <Controls run={stack.run} label={`Stack ${stack.op}`} />}
        {mode === 'queue' && <Controls run={queue.run} label={`Queue ${queue.op}`} />}
        {mode === 'list' && <Controls run={list.run} label={`List ${list.op}`} />}
      </div>
      <div className="viz__side">
        {mode === 'stack' && <><Code lines={STACK_CODE[stack.op]} active={sf?.line ?? -1} label={`Stack ${stack.op}`} />{sf && <Readout note={sf.note} counts={sf.counts} />}</>}
        {mode === 'queue' && <><Code lines={QUEUE_CODE[queue.op]} active={qf?.line ?? -1} label={`Queue ${queue.op}`} />{qf && <Readout note={qf.note} counts={qf.counts} />}</>}
        {mode === 'list' && <><Code lines={LIST_CODE[list.op]} active={lf?.line ?? -1} label={`List ${list.op}`} />{lf && <Readout note={lf.note} counts={lf.counts} />}</>}
      </div>
    </div>
  )
}
