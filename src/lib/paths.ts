import type { Frame } from './algo'

// Finding the way home: a grid of town streets seen from above, a walker at
// one corner of it and the lit window somewhere else. Four searches look for
// the way, each recorded as frames. A run is compact: the times at which each
// cell joined the frontier and was searched are written once into a Trace,
// and every frame only carries the clock, so a frame never copies the grid.
export const STREET = 0
export const WALL = 1
export const SLOW = 2
export const SLOW_COST = 5
export type Cell = typeof STREET | typeof WALL | typeof SLOW

export type Grid = { w: number; h: number; cells: Uint8Array; start: number; goal: number }

export const NEVER = 0x7fffffff
export type Trace = {
  discT: Int32Array // the clock when a cell joined the frontier, NEVER if it never did
  visitT: Int32Array // the clock when a cell was searched, NEVER if it never was
  visitN: Int32Array // its place in the order of searched cells, for the lamplight's age
  path: number[] // walker to window, once found
}
export type PathState = {
  trace: Trace
  t: number // the clock: a cell is searched or on the frontier if its time is at most t
  n: number // how many cells have been searched
  cur: number // the cell being searched now, -1 for none
  lit: number // how many cells of the path are lit, from the walker
  end?: 'home' | 'none'
}
export type PathId = 'bfs' | 'dfs' | 'dijkstra' | 'astar'
type Gen = Generator<Frame<PathState>, void>

export const PATHS: { id: PathId; name: string; full: string; code: string[] }[] = [
  { id: 'bfs', name: 'BFS', full: 'Breadth-first search', code: [
    'queue = [start]; mark start',
    'while queue is not empty:',
    '  cell = queue.shift()',
    '  if cell is home: walk back, done',
    '  for each street next to cell:',
    '    if not marked: mark it, queue it',
    'no way home',
  ] },
  { id: 'dfs', name: 'DFS', full: 'Depth-first search', code: [
    'stack = [start]',
    'while stack is not empty:',
    '  cell = stack.pop()',
    '  if cell was seen: skip it',
    '  see cell',
    '  if cell is home: walk back, done',
    '  for each street next to cell:',
    '    if not seen: stack.push(it)',
    'no way home',
  ] },
  { id: 'dijkstra', name: 'Dijkstra', full: 'Dijkstra', code: [
    'dist[start] = 0; heap = [(0, start)]',
    'while heap is not empty:',
    '  (d, cell) = heap.popMin()',
    '  if settled: skip; else settle it',
    '  if cell is home: walk back, done',
    '  for each street next to cell:',
    '    nd = d + cost(next)  # slow: 5',
    '    if nd < dist[next]:',
    '      dist[next] = nd; push it',
    'no way home',
  ] },
  { id: 'astar', name: 'A*', full: 'A*', code: [
    'h(cell) = |dx| + |dy| to home',
    'g[start] = 0; heap = [start]',
    'while heap is not empty:',
    '  cell = heap.popMin()  # least g+h',
    '  if settled: skip; else settle it',
    '  if cell is home: walk back, done',
    '  for each street next to cell:',
    '    ng = g[cell] + cost(next)',
    '    if ng < g[next]:',
    '      g[next] = ng; push it',
    'no way home',
  ] },
]

const INTRO: Record<PathId, string> = {
  bfs: 'Breadth-first search lights the streets in rings: every street one step away, then two, then three. It does not see slow streets.',
  dfs: 'Depth-first search follows one street as far as it goes before backing up. It finds a way, rarely the best one.',
  dijkstra: 'Dijkstra always takes the cheapest street left to reach, so it goes round a slow street when that costs less.',
  astar: 'A* is Dijkstra with a sense of direction: it adds the distance left to home, so the light leans toward the window.',
}

// ---------- The grid ----------

export const xy = (g: Grid, c: number): [number, number] => [c % g.w, Math.floor(c / g.w)]
export const cost = (g: Grid, c: number) => (g.cells[c] === SLOW ? SLOW_COST : 1)

// The open streets next to a cell, in the order up, right, down, left.
function around(g: Grid, c: number): number[] {
  const x = c % g.w, y = Math.floor(c / g.w)
  const out: number[] = []
  if (y > 0) out.push(c - g.w)
  if (x < g.w - 1) out.push(c + 1)
  if (y < g.h - 1) out.push(c + g.w)
  if (x > 0) out.push(c - 1)
  return out.filter((n) => g.cells[n] !== WALL)
}

// Columns and rows for a stage this wide: cells of at least 17px, at most
// 41 by 21. Both counts are one more than a multiple of four, so the town's
// blocks and the maze's rooms fit exactly; phones get a taller town that
// suits a portrait screen.
export function dimsFor(width: number): [number, number] {
  const fit = Math.floor(width / 17)
  const cols = Math.max(13, Math.min(41, fit - ((((fit - 1) % 4) + 4) % 4)))
  const rows = cols >= 33 ? 21 : Math.min(29, cols + 4)
  return [cols, rows]
}

const blank = (w: number, h: number, start: number, goal: number): Grid => ({ w, h, cells: new Uint8Array(w * h), start, goal })

// The walker and the window keep their places when the grid keeps its size;
// otherwise they go to opposite sides of it.
function ends(w: number, h: number, keep?: Grid): [number, number] {
  if (keep && keep.w === w && keep.h === h) return [keep.start, keep.goal]
  return [4 * w, (h - 5) * w + w - 1]
}

// Is there any way at all from the walker to the window?
function connected(g: Grid): boolean {
  const seen = new Uint8Array(g.w * g.h)
  const q = [g.start]
  seen[g.start] = 1
  for (let k = 0; k < q.length; k++) {
    if (q[k] === g.goal) return true
    for (const n of around(g, q[k])) if (!seen[n]) { seen[n] = 1; q.push(n) }
  }
  return false
}

// The town: blocks of buildings three cells square between streets, with a
// square left open here and there, some blocks built across the street
// between them so the way has to go round, and a market street or two
// that is slow to cross.
export function town(w: number, h: number, random: () => number): Grid {
  for (let tries = 0; ; tries++) {
    const g = blank(w, h, ...ends(w, h))
    const bw = (w - 1) / 4, bh = (h - 1) / 4
    const fill = (x0: number, y0: number, x1: number, y1: number, v: Cell) => {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g.cells[y * w + x] = v
    }
    for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
      if (random() < 0.12) continue
      const x = bx * 4 + 1, y = by * 4 + 1
      fill(x, y, x + 2, y + 2, WALL)
      if (bx < bw - 1 && random() < 0.22) fill(x + 3, y, x + 3, y + 2, WALL)
      if (by < bh - 1 && random() < 0.18) fill(x, y + 3, x + 2, y + 3, WALL)
    }
    // A market across the middle and a slow avenue, both partly.
    const row = 4 * (1 + Math.floor(random() * (bh - 1)))
    const a = 4 * Math.floor(random() * (bw / 2)), b = Math.min(w - 1, a + 4 * (2 + Math.floor(random() * (bw / 2))))
    for (let x = a; x <= b; x++) if (g.cells[row * w + x] === STREET) g.cells[row * w + x] = SLOW
    const col = 4 * (1 + Math.floor(random() * (bw - 1)))
    const c0 = 4 * Math.floor(random() * (bh / 2)), c1 = Math.min(h - 1, c0 + 4 * (1 + Math.floor(random() * bh / 2)))
    for (let y = c0; y <= c1; y++) if (g.cells[y * w + col] === STREET) g.cells[y * w + col] = SLOW
    g.cells[g.start] = STREET
    g.cells[g.goal] = STREET
    if (connected(g) || tries > 20) return g
  }
}

// A maze carved by the recursive backtracker: rooms on the even cells, walls
// between them knocked through one at a time down a random corridor, backing
// up at every dead end. A few more walls are then opened so the maze has
// loops, which is what lets the four searches find different ways.
export function maze(prev: Grid, random: () => number): Grid {
  const { w, h } = prev
  const cells = new Uint8Array(w * h).fill(WALL)
  const rw = (w + 1) / 2, rh = (h + 1) / 2
  const room = (rx: number, ry: number) => ry * 2 * w + rx * 2
  const seen = new Uint8Array(rw * rh)
  const first = Math.floor(random() * rw * rh)
  const stack = [first]
  seen[first] = 1
  cells[room(first % rw, Math.floor(first / rw))] = STREET
  while (stack.length) {
    const r = stack[stack.length - 1]
    const rx = r % rw, ry = Math.floor(r / rw)
    const next = ([[0, -1], [1, 0], [0, 1], [-1, 0]] as const)
      .map(([dx, dy]) => [rx + dx, ry + dy] as const)
      .filter(([x, y]) => x >= 0 && y >= 0 && x < rw && y < rh && !seen[y * rw + x])
    if (!next.length) { stack.pop(); continue }
    const [nx, ny] = next[Math.floor(random() * next.length)]
    seen[ny * rw + nx] = 1
    cells[room(nx, ny)] = STREET
    cells[(ry + ny) * w + (rx + nx)] = STREET // the wall between, at the midpoint
    stack.push(ny * rw + nx)
  }
  for (let k = Math.round(rw * rh * 0.06); k > 0; k--) {
    const x = Math.floor(random() * w), y = Math.floor(random() * h)
    if ((x + y) % 2 === 1) cells[y * w + x] = STREET // a wall between two rooms
  }
  // The walker and the window move to the nearest room, so the maze reaches them.
  const snap = (c: number) => { const x = c % w, y = Math.floor(c / w); return (y - (y % 2)) * w + (x - (x % 2)) }
  const start = snap(prev.start)
  let goal = snap(prev.goal)
  if (start === goal) goal = start === 0 ? 2 : 0
  return { w, h, cells, start, goal }
}

// Buildings dropped at random, about three cells in ten.
export function scatter(prev: Grid, random: () => number): Grid {
  const g = blank(prev.w, prev.h, prev.start, prev.goal)
  for (let c = 0; c < g.cells.length; c++) if (c !== g.start && c !== g.goal && random() < 0.3) g.cells[c] = WALL
  return g
}

export const clear = (prev: Grid): Grid => blank(prev.w, prev.h, prev.start, prev.goal)

// Paints cells with a value, leaving the walker and the window alone. The
// same grid comes back when nothing changes, so the run is not reset.
export function paint(g: Grid, list: number[], v: Cell): Grid {
  const todo = list.filter((c) => c !== g.start && c !== g.goal && g.cells[c] !== v)
  if (!todo.length) return g
  const cells = g.cells.slice()
  for (const c of todo) cells[c] = v
  return { ...g, cells }
}

// Moves the walker or the window; whatever stood on the new cell is cleared.
export function place(g: Grid, which: 'start' | 'goal', c: number): Grid {
  if (c === g.start || c === g.goal) return g
  const cells = g.cells[c] === STREET ? g.cells : g.cells.slice()
  cells[c] = STREET
  return { ...g, cells, [which]: c }
}

// The cells on a straight line between two, so a quick drag leaves no gaps.
export function line(g: Grid, a: number, b: number): number[] {
  let [x0, y0] = xy(g, a)
  const [x1, y1] = xy(g, b)
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  const out: number[] = []
  for (;;) {
    out.push(y0 * g.w + x0)
    if (x0 === x1 && y0 === y1) return out
    const e2 = 2 * err
    if (e2 >= dy) { err += dy; x0 += sx }
    if (e2 <= dx) { err += dx; y0 += sy }
  }
}

// ---------- The searches ----------

// A small binary heap of [key, tie, cell], least key first, then least tie.
class Heap {
  private a: [number, number, number][] = []
  get size() { return this.a.length }
  private less(i: number, j: number) { const p = this.a[i], q = this.a[j]; return p[0] < q[0] || (p[0] === q[0] && p[1] < q[1]) }
  private swap(i: number, j: number) { [this.a[i], this.a[j]] = [this.a[j], this.a[i]] }
  push(e: [number, number, number]) {
    this.a.push(e)
    for (let i = this.a.length - 1; i > 0;) { const p = (i - 1) >> 1; if (!this.less(i, p)) break; this.swap(i, p); i = p }
  }
  pop(): [number, number, number] {
    const top = this.a[0], last = this.a.pop()!
    if (this.a.length) {
      this.a[0] = last
      for (let i = 0; ;) {
        const l = 2 * i + 1, r = l + 1
        let m = i
        if (l < this.a.length && this.less(l, m)) m = l
        if (r < this.a.length && this.less(r, m)) m = r
        if (m === i) break
        this.swap(i, m); i = m
      }
    }
    return top
  }
}

// Every search writes into one Trace and yields frames that carry its clock.
function tracer(g: Grid) {
  const size = g.w * g.h
  const trace: Trace = { discT: new Int32Array(size).fill(NEVER), visitT: new Int32Array(size).fill(NEVER), visitN: new Int32Array(size), path: [] }
  const from = new Int32Array(size).fill(-1)
  const counts = { visited: 0, frontier: 0, length: 0, cost: 0 }
  let t = 0, cur = -1, lit = 0
  let end: PathState['end']
  const frame = (line: number, note: string): Frame<PathState> =>
    ({ state: { trace, t, n: counts.visited, cur, lit, end }, line, note, counts: { ...counts } })
  // Joins the frontier the first time only; later pushes of the same cell
  // (DFS, and the heaps' cheaper ways) keep its first time.
  const discover = (c: number) => { if (trace.discT[c] !== NEVER) return false; trace.discT[c] = ++t; counts.frontier++; return true }
  const visit = (c: number) => { trace.visitT[c] = ++t; trace.visitN[c] = counts.visited++; counts.frontier--; cur = c }
  const visited = (c: number) => trace.visitT[c] !== NEVER
  // Home: walk the from-links back to the walker, then light the way one
  // cell at a time from the walker's end.
  function* home(lineNo: number): Gen {
    const path: number[] = []
    for (let c = g.goal; c !== -1; c = from[c]) path.push(c)
    path.reverse()
    trace.path = path
    end = 'home'
    cur = -1
    yield frame(lineNo, `Home. The lit window is found after searching ${counts.visited} cells.`)
    for (let i = 1; i <= path.length; i++) {
      lit = i
      if (i > 1) { counts.length = i - 1; counts.cost += cost(g, path[i - 1]) }
      yield frame(lineNo, i < path.length
        ? 'Walk back the way each cell was reached, lighting the way home.'
        : `The way home: ${counts.length} steps, costing ${counts.cost}.`)
    }
  }
  function* none(lineNo: number): Gen {
    end = 'none'
    cur = -1
    yield frame(lineNo, `No way home. Every street the walker can reach has been searched, ${counts.visited} cells, and the window is walled off.`)
  }
  return { trace, from, counts, frame, discover, visit, visited, home, none }
}

const plural = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`

function* bfs(g: Grid): Gen {
  const { from, frame, discover, visit, home, none } = tracer(g)
  const dist = new Int32Array(g.w * g.h)
  const q = [g.start]
  discover(g.start)
  yield frame(0, INTRO.bfs)
  for (let k = 0; k < q.length; k++) {
    const c = q[k]
    visit(c)
    yield frame(2, `Take the oldest street in the queue, ${plural(dist[c], 'step', 'steps')} from the walker.`)
    if (c === g.goal) { yield* home(3); return }
    let added = 0
    for (const n of around(g, c)) if (discover(n)) { from[n] = c; dist[n] = dist[c] + 1; q.push(n); added++ }
    yield frame(5, added ? `Queue ${plural(added, 'new street', 'new streets')} next to it.` : 'Nothing new next to it.')
  }
  yield* none(6)
}

function* dfs(g: Grid): Gen {
  const { from, frame, discover, visit, visited, home, none } = tracer(g)
  const stack: [number, number][] = [[g.start, -1]]
  discover(g.start)
  yield frame(0, INTRO.dfs)
  while (stack.length) {
    const [c, parent] = stack.pop()!
    if (visited(c)) continue
    from[c] = parent
    visit(c)
    yield frame(4, 'Take the newest street on the stack and keep going.')
    if (c === g.goal) { yield* home(5); return }
    let added = 0
    for (const n of around(g, c)) if (!visited(n)) { discover(n); stack.push([n, c]); added++ }
    yield frame(7, added ? `Push ${plural(added, 'street', 'streets')}; the last one pushed is tried next.` : 'A dead end: back up to the last street pushed.')
  }
  yield* none(8)
}

// Dijkstra and A* are one search; A* adds the distance left to its keys.
function* cheapest(g: Grid, guided: boolean): Gen {
  const id: PathId = guided ? 'astar' : 'dijkstra'
  const { from, frame, discover, visit, visited, home, none } = tracer(g)
  const [gx, gy] = xy(g, g.goal)
  const left = (c: number) => { if (!guided) return 0; const [x, y] = xy(g, c); return Math.abs(x - gx) + Math.abs(y - gy) }
  const dist = new Int32Array(g.w * g.h).fill(NEVER)
  const heap = new Heap()
  let seq = 0
  const o = guided ? 1 : 0 // A*'s code has one more line at the top
  dist[g.start] = 0
  heap.push([left(g.start), guided ? left(g.start) : seq++, g.start])
  discover(g.start)
  yield frame(o, INTRO[id])
  while (heap.size) {
    const [, , c] = heap.pop()
    if (visited(c)) continue
    visit(c)
    const h = left(c)
    yield frame(o + 2, guided
      ? `Take the street with the least cost so far plus distance left: ${dist[c]} + ${h} = ${dist[c] + h}.`
      : `Take the cheapest street left to reach: it costs ${dist[c]}.`)
    if (c === g.goal) { yield* home(o + 4); return }
    let better = 0
    for (const n of around(g, c)) {
      if (visited(n)) continue
      const nd = dist[c] + cost(g, n)
      if (nd < dist[n]) {
        dist[n] = nd
        from[n] = c
        // Equal keys go to the one nearer home in A*, so it runs straight
        // instead of fanning out across ties.
        heap.push([nd + left(n), guided ? left(n) : seq++, n])
        discover(n)
        better++
      }
    }
    yield frame(o + 8, better ? `A cheaper way to ${plural(better, 'street', 'streets')} next to it.` : 'No cheaper way to anything next to it.')
  }
  yield* none(o + 9)
}

export const RUNS: Record<PathId, (g: Grid) => Gen> = {
  bfs,
  dfs,
  dijkstra: (g) => cheapest(g, false),
  astar: (g) => cheapest(g, true),
}

// The town a visitor sees first, and the one the Town button draws: drawn
// again a few times until the searches tell different stories on it, BFS
// paying for a slow street that Dijkstra goes round, and A* searching well
// under what Dijkstra does.
export function showcase(w: number, h: number, random: () => number): Grid {
  const last = (run: Gen) => { let f: Frame<PathState> | undefined; for (f of run); return f! }
  let g = town(w, h, random)
  for (let k = 0; k < 16; k++) {
    const b = last(bfs(g)).counts, d = last(cheapest(g, false)).counts, a = last(cheapest(g, true)).counts
    if (b.cost > d.cost && a.visited < d.visited * 0.6) return g
    g = town(w, h, random)
  }
  return g
}
