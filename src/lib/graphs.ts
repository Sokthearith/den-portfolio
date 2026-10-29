import type { Counts, Frame } from './algo'

// The night map: eleven places joined by seventeen roads, and five ways of
// going over it, each recorded as frames. Two walks (breadth and depth
// first), the shortest routes from one place (Dijkstra), and two ways of
// joining every place with the least road (Prim and Kruskal).

// A place is drawn as a small building whose windows light up. It stands on
// its point, so its roads meet under it; cols and rows are its windows.
export type Place = { id: number; name: string; x: number; y: number; cols: number; rows: number; roof?: boolean }
export type Road = { id: number; a: number; b: number; len: number }
export type Graph = { places: Place[]; roads: Road[] }

// One entry in the strip under the map: the queue, the stack, the heap or
// the sorted list of roads, whichever the algorithm keeps.
export type Chip = { key: string; text: string; val?: string; flag?: 'next' | 'on' | 'kept' | 'out' }

export type GraphState = {
  order: number[] // per place: when it was visited, settled or joined, from 1; 0 for not yet
  seen: number[] // places waiting in the queue, the stack or the heap
  cur?: number // the place the running line is on
  look?: [number, number] // the road being looked at, and the place it is looked at from
  bad?: boolean // the road being looked at is turned down
  tree: [number, number][] // roads kept, each with the place it was drawn from
  out: number[] // roads turned down for good
  loop?: number[] // the roads that already join both ends of the one turned down
  dist?: (number | null)[] // Dijkstra's distances, null while a place is out of reach
  was?: { at: number; from: number | null } // the distance just lowered, and what it had been
  near?: number[] // Dijkstra: the best road found so far to each place not yet settled
  dock: { name: string; chips: Chip[] }
}
export type GraphId = 'bfs' | 'dfs' | 'dijkstra' | 'prim' | 'kruskal'
type Gen = Generator<Frame<GraphState>, void>

// Hand placed on a 1000 by 640 sheet: the farm and the school up in the
// north-west, the river running down past the bridge, the harbour on the
// east bank. The roads below are fixed; only their lengths are rolled.
export const PLACES: Place[] = [
  { id: 0, name: 'Station', x: 520, y: 110, cols: 4, rows: 2 },
  { id: 1, name: 'Market', x: 430, y: 310, cols: 3, rows: 2 },
  { id: 2, name: 'Cinema', x: 660, y: 530, cols: 4, rows: 2 },
  { id: 3, name: 'Library', x: 210, y: 310, cols: 3, rows: 2 },
  { id: 4, name: 'Bridge', x: 690, y: 310, cols: 2, rows: 1 },
  { id: 5, name: 'Park', x: 110, y: 530, cols: 2, rows: 1, roof: true },
  { id: 6, name: 'Harbour', x: 900, y: 440, cols: 3, rows: 2 },
  { id: 7, name: 'School', x: 300, y: 110, cols: 3, rows: 2, roof: true },
  { id: 8, name: 'Bakery', x: 400, y: 530, cols: 2, rows: 2, roof: true },
  { id: 9, name: 'Tower', x: 870, y: 130, cols: 2, rows: 4 },
  { id: 10, name: 'Farm', x: 90, y: 120, cols: 2, rows: 1, roof: true },
]
const LINKS: [number, number][] = [
  [10, 7], [10, 3], [7, 0], [7, 3], [0, 1], [0, 9], [0, 4], [9, 6], [3, 1],
  [3, 5], [1, 4], [1, 8], [5, 8], [8, 2], [4, 2], [4, 6], [2, 6],
]

// The same streets with new lengths, 1 to 9.
export function nightMap(random: () => number): Graph {
  return { places: PLACES, roads: LINKS.map(([a, b], id) => ({ id, a, b, len: 1 + Math.floor(random() * 9) })) }
}

export const GRAPHS: { id: GraphId; name: string; start: boolean; badges: boolean; code: string[] }[] = [
  { id: 'bfs', name: 'BFS', start: true, badges: true, code: [
    'queue = [start]; mark start seen',
    'while queue is not empty:',
    '  place = take from the front',
    '  visit place',
    '  for each road out, shortest first:',
    '    if its far end is seen: skip it',
    '    else mark it seen; queue it',
  ] },
  { id: 'dfs', name: 'DFS', start: true, badges: true, code: [
    'stack = [start]',
    'while stack is not empty:',
    '  place = take from the top',
    '  if place is visited: skip it',
    '  visit place',
    '  for each road out, longest first:',
    '    if its far end is not visited:',
    '      push it on the stack',
  ] },
  { id: 'dijkstra', name: 'Dijkstra', start: true, badges: false, code: [
    'dist[all] = ∞; dist[start] = 0',
    'queue = {start at 0}',
    'while queue is not empty:',
    '  place = pop the nearest; settle it',
    '  for each road to an unsettled n:',
    '    d = dist[place] + road',
    '    if d >= dist[n]: keep dist[n]',
    '    else dist[n] = d; queue n at d',
  ] },
  { id: 'prim', name: 'Prim', start: true, badges: true, code: [
    'tree = {start}',
    'roads = the roads out of start',
    'while a place is outside the tree:',
    '  road = pop the shortest of roads',
    '  if both ends in tree: skip it',
    '  add road and its far end to tree',
    '  add the far end\'s roads to roads',
  ] },
  { id: 'kruskal', name: 'Kruskal', start: false, badges: false, code: [
    'sort the roads, shortest first',
    'every place is a group of its own',
    'for each road (a, b) in that order:',
    '  if a, b are in different groups:',
    '    keep the road; merge the groups',
    '  else skip it: it closes a loop',
  ] },
]

const name = (p: number) => PLACES[p].name
const far = (r: Road, p: number) => (r.a === p ? r.b : r.a)
const pair = (r: Road) => `${name(r.a)}–${name(r.b)}`
const fmt = (d: number | null) => (d === null ? '∞' : `${d}`)
// "Market", "Market and Park", "Market, Park and Farm".
const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)
// Shortest first, so "New roads" changes every walk as well as the routes.
const byLen = (x: Road, y: Road) => x.len - y.len || x.id - y.id
function roadsOut(g: Graph, p: number) {
  return g.roads.filter((r) => r.a === p || r.b === p).sort((x, y) => byLen(x, y) || name(far(x, p)).localeCompare(name(far(y, p))))
}

// Every generator keeps its own working state and yields copies of it; the
// strip under the map is drawn by the dock function each one passes in.
function recorder(g: Graph, counts: Counts, dock: () => GraphState['dock'], seen: () => number[]) {
  const order = g.places.map(() => 0)
  const tree: [number, number][] = []
  const out: number[] = []
  let k = 0
  const frame = (line: number, note: string, extra: Partial<GraphState> = {}): Frame<GraphState> =>
    ({ state: { order: order.slice(), seen: seen(), tree: tree.slice(), out: out.slice(), dock: dock(), ...extra }, line, note, counts: { ...counts } })
  const mark = (p: number) => (order[p] = ++k)
  return { order, tree, out, frame, mark }
}
const nth = (k: number) => `${k}${k % 100 > 10 && k % 100 < 14 ? 'th' : ['th', 'st', 'nd', 'rd'][k % 10] ?? 'th'}`

function* bfs(g: Graph, start: number): Gen {
  const counts = { visited: 0, considered: 0 }
  const queue = [start]
  const seen = new Set([start])
  const { order, tree, frame, mark } = recorder(g, counts, () => ({
    name: 'Queue, front first',
    chips: queue.map((p, i) => ({ key: `${p}`, text: name(p), flag: i === 0 ? 'next' : undefined })),
  }), () => queue.slice())
  yield frame(-1, `Breadth first from ${name(start)}: every place one road away, then two roads, then three.`)
  yield frame(0, `${name(start)} goes in the queue.`, { cur: start })
  while (queue.length) {
    const p = queue.shift()!
    mark(p)
    counts.visited++
    yield frame(3, `Take ${name(p)} from the front and visit it, ${nth(order[p])}.`, { cur: p })
    for (const r of roadsOut(g, p)) {
      const n = far(r, p)
      counts.considered++
      if (seen.has(n)) {
        yield frame(5, `${name(n)} is seen already: skip it.`, { cur: p, look: [r.id, p], bad: true })
        continue
      }
      seen.add(n)
      queue.push(n)
      tree.push([r.id, p])
      yield frame(6, `${name(n)} is new: it joins the back of the queue, and the road to it joins the tree.`, { cur: p, look: [r.id, p] })
    }
  }
  yield frame(-1, `All ${g.places.length} places visited. The lit roads are the breadth-first tree: each place by the fewest roads from ${name(start)}.`)
}

function* dfs(g: Graph, start: number): Gen {
  const counts = { visited: 0, considered: 0 }
  // Each entry remembers the road it was pushed by, which becomes a tree
  // road if the place is still unvisited when it comes off the top.
  const stack: { p: number; r: number; from: number }[] = [{ p: start, r: -1, from: -1 }]
  const { order, tree, frame, mark } = recorder(g, counts, () => ({
    name: 'Stack, top first',
    chips: stack.map((s, i): Chip => ({ key: `${i}`, text: name(s.p), flag: order[s.p] ? 'out' : i === stack.length - 1 ? 'next' : undefined })).reverse(),
  }), () => stack.filter((s) => !order[s.p]).map((s) => s.p))
  yield frame(-1, `Depth first from ${name(start)}: follow one road as far as it goes, then back up and try the next.`)
  yield frame(0, `${name(start)} goes on the stack.`, { cur: start })
  while (stack.length) {
    const top = stack.pop()!
    const p = top.p
    if (order[p]) {
      yield frame(3, `${name(p)} comes off the top, but it is visited already: skip it.`, { cur: p })
      continue
    }
    mark(p)
    counts.visited++
    if (top.r >= 0) tree.push([top.r, top.from])
    yield frame(4, `Take ${name(p)} from the top and visit it, ${nth(order[p])}.`, { cur: p })
    // Pushed longest first, so the shortest road out ends up on top.
    for (const r of roadsOut(g, p).reverse()) {
      const n = far(r, p)
      counts.considered++
      if (order[n]) {
        yield frame(6, `${name(n)} is visited already.`, { cur: p, look: [r.id, p], bad: true })
        continue
      }
      stack.push({ p: n, r: r.id, from: p })
      yield frame(7, `Push ${name(n)} on the stack.`, { cur: p, look: [r.id, p] })
    }
  }
  yield frame(-1, `All ${g.places.length} places visited. The lit roads are the depth-first tree: long branches, followed as deep as they went.`)
}

function* dijkstra(g: Graph, start: number): Gen {
  const counts = { settled: 0, considered: 0, relaxed: 0 }
  const dist: (number | null)[] = g.places.map(() => null)
  const via: number[] = g.places.map(() => -1)
  const queue = new Set<number>()
  // The nearest first; on a tie, the one that has been waiting longest.
  const sorted = () => [...queue].sort((x, y) => dist[x]! - dist[y]!)
  const { order, tree, frame, mark } = recorder(g, counts, () => ({
    name: 'Queue, nearest first',
    chips: sorted().map((p, i) => ({ key: `${p}`, text: name(p), val: fmt(dist[p]), flag: i === 0 ? 'next' : undefined })),
  }), () => [...queue])
  const extra = () => ({ dist: dist.slice(), near: via.filter((r, p) => r >= 0 && !order[p]) })
  yield frame(-1, `Dijkstra from ${name(start)}: always settle the nearest place not yet settled.`, extra())
  dist[start] = 0
  yield frame(0, `Every place starts infinitely far away, except ${name(start)}, which is 0 from itself.`, { ...extra(), cur: start })
  queue.add(start)
  yield frame(1, `${name(start)} goes in the queue at 0.`, { ...extra(), cur: start })
  while (queue.size) {
    const p = sorted()[0]
    queue.delete(p)
    mark(p)
    counts.settled++
    if (via[p] >= 0) tree.push([via[p], far(g.roads[via[p]], p)])
    yield frame(3, `The nearest in the queue is ${name(p)}, at ${dist[p]}. Nothing can reach it any shorter now: it is settled.`, { ...extra(), cur: p })
    for (const r of roadsOut(g, p)) {
      const n = far(r, p)
      if (order[n]) continue
      counts.considered++
      const d = dist[p]! + r.len
      yield frame(5, `By way of ${name(p)}, ${name(n)} is ${dist[p]} + ${r.len} = ${d}.`, { ...extra(), cur: p, look: [r.id, p] })
      const old = dist[n]
      if (old !== null && d >= old) {
        yield frame(6, `That is no shorter than ${old}: ${name(n)} keeps its distance.`, { ...extra(), cur: p, look: [r.id, p], bad: true })
        continue
      }
      dist[n] = d
      via[n] = r.id
      queue.add(n)
      counts.relaxed++
      yield frame(7, `Shorter: ${name(n)} goes from ${fmt(old)} to ${d}.`, { ...extra(), cur: p, look: [r.id, p], was: { at: n, from: old } })
    }
  }
  yield frame(-1, `Every place settled. The lit roads are the shortest routes from ${name(start)}; tap a place to follow its route.`, extra())
}

function* prim(g: Graph, start: number): Gen {
  const counts = { joined: 0, considered: 0, total: 0 }
  const roads: Road[] = []
  const { order, tree, out, frame, mark } = recorder(g, counts, () => ({
    name: 'Roads leaving the tree, shortest first',
    chips: roads.map((r, i) => ({ key: `${r.id}`, text: pair(r), val: `${r.len}`, flag: order[r.a] && order[r.b] ? 'out' : i === 0 ? 'next' : undefined })),
  }), () => [...new Set(roads.flatMap((r) => [r.a, r.b]))].filter((p) => !order[p]))
  const offer = (p: number) => {
    for (const r of roadsOut(g, p)) if (!order[far(r, p)] && !roads.includes(r)) roads.push(r)
    roads.sort(byLen)
  }
  yield frame(-1, `Prim from ${name(start)}: grow one tree, always by the shortest road leaving it.`)
  mark(start)
  counts.joined++
  yield frame(0, `The tree starts as ${name(start)} alone.`, { cur: start })
  offer(start)
  yield frame(1, `Its roads out are the first candidates.`, { cur: start })
  while (counts.joined < g.places.length && roads.length) {
    const r = roads.shift()!
    counts.considered++
    if (order[r.a] && order[r.b]) {
      out.push(r.id)
      yield frame(4, `${pair(r)}, ${r.len}, is the shortest left, but both ends are in the tree already: it would close a loop.`, { look: [r.id, r.a], bad: true })
      continue
    }
    const from = order[r.a] ? r.a : r.b, to = far(r, from)
    yield frame(3, `The shortest road leaving the tree is ${pair(r)}, ${r.len}.`, { look: [r.id, from] })
    tree.push([r.id, from])
    mark(to)
    counts.joined++
    counts.total += r.len
    yield frame(5, `Take it: ${name(to)} joins the tree. Road so far: ${counts.total}.`, { cur: to })
    if (counts.joined < g.places.length) {
      offer(to)
      yield frame(6, `${name(to)}'s roads to places outside the tree join the candidates.`, { cur: to })
    }
  }
  yield frame(-1, `All ${g.places.length} places joined by ${g.places.length - 1} roads, ${counts.total} long in all. No shorter set of roads joins them.`)
}

function* kruskal(g: Graph): Gen {
  const counts = { considered: 0, kept: 0, total: 0 }
  const sorted = g.roads.slice().sort(byLen)
  const group = g.places.map((_, i) => i)
  const find = (p: number): number => (group[p] === p ? p : (group[p] = find(group[p])))
  // The road being looked at, as a place in the sorted list; past the end for none.
  let at = sorted.length
  const { tree, out, frame, mark, order } = recorder(g, counts, () => ({
    name: 'Every road, shortest first',
    chips: sorted.map((r, i) => ({
      key: `${r.id}`, text: pair(r), val: `${r.len}`,
      flag: i === at ? 'on' : tree.some(([t]) => t === r.id) ? 'kept' : out.includes(r.id) ? 'out' : undefined,
    })),
  }), () => [])
  // The roads already kept that lead from a to b, found by walking the forest.
  const joining = (a: number, b: number) => {
    const back = new Map<number, [number, number]>([[a, [-1, -1]]])
    const todo = [a]
    while (todo.length) {
      const p = todo.shift()!
      if (p === b) break
      for (const [t] of tree) {
        const r = g.roads[t]
        if (r.a !== p && r.b !== p) continue
        const n = far(r, p)
        if (!back.has(n)) { back.set(n, [t, p]); todo.push(n) }
      }
    }
    const roads: number[] = [], stops: string[] = []
    for (let p = b; p !== a;) { const [t, prev] = back.get(p)!; roads.push(t); if (prev !== a) stops.push(name(prev)); p = prev }
    return { roads, stops: stops.reverse() }
  }
  yield frame(-1, 'Kruskal: take the roads shortest first, anywhere on the map, and keep each one that joins two places not yet joined.')
  yield frame(0, `The ${sorted.length} roads, shortest first.`)
  yield frame(1, 'Every place starts as a group of its own.')
  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i]
    at = i
    counts.considered++
    yield frame(3, `Next is ${pair(r)}, ${r.len}. Are ${name(r.a)} and ${name(r.b)} in different groups?`, { look: [r.id, r.a] })
    if (find(r.a) !== find(r.b)) {
      group[find(r.a)] = find(r.b)
      tree.push([r.id, r.a])
      if (!order[r.a]) mark(r.a)
      if (!order[r.b]) mark(r.b)
      counts.kept++
      counts.total += r.len
      yield frame(4, `They are: keep the road and merge the two groups. Road so far: ${counts.total}.`, { look: [r.id, r.a] })
      if (counts.kept === g.places.length - 1) {
        at = sorted.length
        yield frame(-1, `${counts.kept} roads join all ${g.places.length} places, ${counts.total} long in all. The roads still to come are never needed.`)
        return
      }
    } else {
      out.push(r.id)
      const { roads, stops } = joining(r.a, r.b)
      yield frame(5, `${name(r.a)} and ${name(r.b)} are already joined, by way of ${list(stops)}: this road would close a loop. Skip it.`, { look: [r.id, r.a], bad: true, loop: roads })
    }
  }
}

export const RUNS: Record<GraphId, (g: Graph, start: number) => Gen> = { bfs, dfs, dijkstra, prim, kruskal: (g) => kruskal(g) }
