import type { Counts, Frame } from './algo'

// Two trees, each recorded as frames. A binary search tree keeps its nodes
// by id, so when the tree changes shape the stage can slide each node to its
// new place; a min-heap keeps its items by id as they trade places in the
// array, so the same item slides in the tree and in the array at once.

/* ---------- Binary search tree ---------- */

export type TNode = { id: number; v: number; l: number | null; r: number | null }
export type Tree = { root: number | null; nodes: TNode[]; next: number }
export type BstState = Tree & {
  trail: number[] // the walk so far, root first: a search path, or the call stack of a traversal
  at?: number // the node the running line is touching
  probe?: number // a value being walked down the tree, carried beside `at`
  mark?: number // the node found, or the one being deleted
  succ?: number // the in-order successor that will take a deleted node's place
  gone?: number // a node on its way out
  done?: number[] // nodes a traversal has already output
  out?: number[] // the values a traversal has output, in order
  queue?: number[] // the nodes waiting, for level order
}
export type BstOp = 'insert' | 'search' | 'delete' | 'inorder' | 'preorder' | 'postorder' | 'level' | 'sorted'
type BGen = Generator<Frame<BstState>, void>
type Make = (line: number, note: string, extra?: Partial<BstState>) => Frame<BstState>

const INSERT = [
  'insert(v):',
  '  node = root',
  '  while node is not empty:',
  '    if v < node.value: node = node.left',
  '    else if v > node.value: node = node.right',
  '    else: v is already here, stop',
  '  hang v where the walk fell off',
]

export const BST_CODE: Record<BstOp, string[]> = {
  insert: INSERT,
  sorted: INSERT,
  search: [
    'search(v):',
    '  node = root',
    '  while node is not empty:',
    '    if v == node.value: found it',
    '    if v < node.value: node = node.left',
    '    else: node = node.right',
    '  v is not in the tree',
  ],
  delete: [
    'delete(v):',
    '  find the node holding v',
    '  if it has no children: remove it',
    '  if it has one child: lift the child up',
    '  if it has two children:',
    '    s = leftmost node of its right subtree',
    '    s\'s right child takes s\'s place',
    '    s takes the node\'s place',
  ],
  inorder: [
    'inorder(node):',
    '  if node is empty: return',
    '  inorder(node.left)',
    '  output node.value',
    '  inorder(node.right)',
  ],
  preorder: [
    'preorder(node):',
    '  if node is empty: return',
    '  output node.value',
    '  preorder(node.left)',
    '  preorder(node.right)',
  ],
  postorder: [
    'postorder(node):',
    '  if node is empty: return',
    '  postorder(node.left)',
    '  postorder(node.right)',
    '  output node.value',
  ],
  level: [
    'queue = [root]',
    'while queue is not empty:',
    '  node = take from the front',
    '  output node.value',
    '  add node.left, node.right to the back',
  ],
}

// A working copy of a tree. Generators change it in place and every frame
// takes a snapshot, so a recording never shares nodes with the tree it
// started from.
class Grove {
  m: Map<number, TNode>
  root: number | null
  next: number
  constructor(t: Tree) {
    this.m = new Map(t.nodes.map((n) => [n.id, { ...n }]))
    this.root = t.root
    this.next = t.next
  }
  get(id: number) { return this.m.get(id)! }
  add(v: number) { const id = this.next++; this.m.set(id, { id, v, l: null, r: null }); return id }
  parent(id: number) { for (const n of this.m.values()) if (n.l === id || n.r === id) return n; return null }
  // Puts `to` where `from` hangs: under the same parent, or as the root.
  replace(from: number, to: number | null) {
    const p = this.parent(from)
    if (!p) this.root = to
    else if (p.l === from) p.l = to
    else p.r = to
  }
  // Height in edges, the textbook way: a lone root is 0, an empty tree too.
  height(id = this.root): number {
    if (id === null) return -1
    const n = this.get(id)
    return 1 + Math.max(this.height(n.l), this.height(n.r))
  }
  snap(): Tree { return { root: this.root, nodes: [...this.m.values()].map((n) => ({ ...n })), next: this.next } }
}

function grower(t: Tree, counts: Counts) {
  const g = new Grove(t)
  const frame: Make = (line, note, extra = {}) => ({
    state: { ...g.snap(), trail: [], ...extra },
    line,
    note,
    counts: { ...counts, nodes: g.m.size, height: Math.max(0, g.height()) },
  })
  return { g, frame }
}

// A tree planted straight from a list of values, with no recording: the
// seeded tree the page starts with. Ids start at `next`, so a new tree never
// reuses an id still on the stage.
export function plant(values: number[], next = 1): Tree {
  const g = new Grove({ root: null, nodes: [], next })
  for (const v of values) {
    if (g.root === null) { g.root = g.add(v); continue }
    let n = g.get(g.root)
    for (;;) {
      if (v === n.v) break
      const side = v < n.v ? 'l' : 'r'
      const k = n[side]
      if (k === null) { n[side] = g.add(v); break }
      n = g.get(k)
    }
  }
  return g.snap()
}

export const values = (t: Tree) => t.nodes.map((n) => n.v)

// The walk an insert takes, shared by a single insert and the sorted run.
function* walkIn(g: Grove, v: number, counts: Counts, frame: Make): BGen {
  if (g.root === null) {
    const id = g.add(v)
    g.root = id
    yield frame(6, `The tree is empty, so ${v} becomes the root.`, { at: id, trail: [id] })
    return
  }
  const trail: number[] = []
  let cur = g.root
  for (;;) {
    const n = g.get(cur)
    trail.push(cur)
    counts.comparisons++
    if (v === n.v) {
      yield frame(5, `${v} = ${n.v}: already in the tree. A search tree holds each value once.`, { at: cur, trail: [...trail], probe: v })
      return
    }
    const left = v < n.v
    yield frame(left ? 3 : 4, `${v} ${left ? '<' : '>'} ${n.v}: go ${left ? 'left' : 'right'}.`, { at: cur, trail: [...trail], probe: v })
    const k = left ? n.l : n.r
    if (k === null) {
      const id = g.add(v)
      if (left) n.l = id
      else n.r = id
      yield frame(6, `Nothing there, so ${v} hangs as ${n.v}'s ${left ? 'left' : 'right'} child.`, { at: id, trail: [...trail, id] })
      return
    }
    cur = k
  }
}

function* insert(t: Tree, v: number): BGen {
  const counts = { comparisons: 0 }
  const { g, frame } = grower(t, counts)
  const before = g.m.size
  if (g.root !== null) yield frame(1, `Insert ${v}. Every insert starts at the root.`, { at: g.root, trail: [g.root], probe: v })
  yield* walkIn(g, v, counts, frame)
  yield frame(-1, g.m.size > before ? `${v} is in, after ${counts.comparisons} comparison${counts.comparisons === 1 ? '' : 's'}.` : `The tree is as it was.`)
}

// The run that shows what a search tree fears: values arriving already in
// order. Each one goes right of the last and the tree becomes a list.
function* sorted(next: number, vals: number[]): BGen {
  const counts = { comparisons: 0 }
  const { g, frame } = grower({ root: null, nodes: [], next }, counts)
  yield frame(-1, `An empty tree, and ${vals.length} values that arrive already sorted: ${vals.join(', ')}.`)
  for (const v of vals) yield* walkIn(g, v, counts, frame)
  const h = Math.max(0, g.height())
  yield frame(-1, `Every value went right. Height ${h} for ${g.m.size} nodes: the tree is a list now, and a search may walk all of it.`)
}

function* search(t: Tree, v: number): BGen {
  const counts = { comparisons: 0 }
  const { g, frame } = grower(t, counts)
  if (g.root === null) { yield frame(6, 'The tree is empty: nothing to find.'); return }
  yield frame(1, `Search for ${v}, starting at the root.`, { at: g.root, trail: [g.root], probe: v })
  const trail: number[] = []
  let cur: number | null = g.root
  while (cur !== null) {
    const n = g.get(cur)
    trail.push(cur)
    counts.comparisons++
    if (v === n.v) {
      yield frame(3, `${v} = ${n.v}: found it, after ${counts.comparisons} comparison${counts.comparisons === 1 ? '' : 's'}.`, { at: cur, mark: cur, trail: [...trail] })
      yield frame(-1, `Found. A search looks at one node per level, never more than height + 1 = ${g.height() + 1}.`, { mark: cur, trail: [...trail] })
      return
    }
    const left = v < n.v
    yield frame(left ? 4 : 5, `${v} ${left ? '<' : '>'} ${n.v}: go ${left ? 'left' : 'right'}.`, { at: cur, trail: [...trail], probe: v })
    const k: number | null = left ? n.l : n.r
    if (k === null) {
      yield frame(6, `${n.v} has nothing to its ${left ? 'left' : 'right'}: ${v} is not in the tree.`, { at: cur, trail: [...trail] })
      return
    }
    cur = k
  }
}

function* remove(t: Tree, v: number): BGen {
  const counts = { comparisons: 0, moves: 0 }
  const { g, frame } = grower(t, counts)
  if (g.root === null) { yield frame(1, 'The tree is empty: nothing to delete.'); return }
  yield frame(1, `Delete ${v}. First find it, starting at the root.`, { at: g.root, trail: [g.root], probe: v })
  // Find the node, the same walk a search takes.
  const trail: number[] = []
  let cur: number | null = g.root
  let hit: TNode | null = null
  while (cur !== null) {
    const n = g.get(cur)
    trail.push(cur)
    counts.comparisons++
    if (v === n.v) { hit = n; break }
    const left = v < n.v
    yield frame(1, `${v} ${left ? '<' : '>'} ${n.v}: go ${left ? 'left' : 'right'}.`, { at: cur, trail: [...trail], probe: v })
    cur = left ? n.l : n.r
  }
  if (!hit) {
    yield frame(1, `The walk fell off the tree: ${v} is not in it, so nothing changes.`, { trail: [...trail] })
    return
  }
  const T = hit
  const kids = [T.l, T.r].filter((k): k is number => k !== null)
  yield frame(1, `${v} = ${T.v}: found it.`, { at: T.id, mark: T.id, trail: [...trail] })

  if (kids.length === 0) {
    yield frame(2, `${v} has no children: it simply comes off.`, { at: T.id, gone: T.id })
    g.replace(T.id, null)
    g.m.delete(T.id)
    counts.moves++
    yield frame(2, `${v} is gone. Nothing else had to move.`)
  } else if (kids.length === 1) {
    const c = kids[0]
    yield frame(3, `${v} has one child, ${g.get(c).v}: lift it, with everything under it, into ${v}'s place.`, { at: c, gone: T.id })
    g.replace(T.id, c)
    g.m.delete(T.id)
    counts.moves++
    yield frame(3, `${g.get(c).v} moved up. Everything under it is still in order.`, { at: c })
  } else {
    yield frame(4, `${v} has two children, so neither can simply move up. Its place goes to its successor: the next value after ${v} in order.`, { mark: T.id, at: T.id })
    let s = g.get(T.r!)
    const walk = [s.id]
    yield frame(5, `The successor lives in the right subtree. Step right once, to ${s.v}.`, { mark: T.id, at: s.id, trail: [...walk] })
    while (s.l !== null) {
      s = g.get(s.l)
      walk.push(s.id)
      yield frame(5, `Then left as far as it goes: ${s.v}.`, { mark: T.id, at: s.id, trail: [...walk] })
    }
    yield frame(5, `${s.v} has nothing to its left: it is the successor, the smallest value bigger than ${v}.`, { mark: T.id, succ: s.id, at: s.id })
    if (s.id !== T.r) {
      const sp = g.parent(s.id)!
      yield frame(6, s.r !== null
        ? `Before ${s.v} leaves, its right child ${g.get(s.r).v} will take its place under ${sp.v}.`
        : `${s.v} has no right child, so its place under ${sp.v} will simply be left empty.`,
      { mark: T.id, succ: s.id, at: s.r ?? sp.id })
    }
    yield frame(7, `${s.v} moves up into ${v}'s place.`, { succ: s.id, at: s.id, gone: T.id })
    if (s.id !== T.r) {
      g.parent(s.id)!.l = s.r
      s.r = T.r
      counts.moves += 2
    }
    s.l = T.l
    g.replace(T.id, s.id)
    g.m.delete(T.id)
    counts.moves += 2
    yield frame(7, `${s.v} sits where ${v} was. Smaller values still hang left of it, bigger ones right.`, { at: s.id })
  }
  yield frame(-1, `${v} is deleted.`)
}

function* depthFirst(t: Tree, order: 'inorder' | 'preorder' | 'postorder'): BGen {
  const counts = { visits: 0 }
  const { g, frame } = grower(t, counts)
  const out: number[] = [], done: number[] = [], stack: number[] = []
  const at = (id: number) => ({ at: id, trail: [...stack], out: [...out], done: [...done] })
  const emit = (n: TNode) => { out.push(n.v); done.push(n.id); counts.visits++ }
  const outLine = order === 'inorder' ? 3 : order === 'preorder' ? 2 : 4
  const name = order === 'inorder' ? 'In-order' : order === 'preorder' ? 'Pre-order' : 'Post-order'
  const rule = order === 'inorder' ? 'left subtree, then the node, then the right' : order === 'preorder' ? 'the node first, then its left subtree, then its right' : 'both subtrees first, the node last'
  yield frame(-1, `${name}: at every node, ${rule}.`, { out: [], done: [] })
  function* go(id: number | null): BGen {
    if (id === null) return
    const n = g.get(id)
    stack.push(id)
    if (order === 'preorder') {
      emit(n)
      yield frame(outLine, `Output ${n.v} on arrival, then its subtrees.`, at(id))
    } else {
      yield frame(2, n.l === null ? `At ${n.v}. Nothing to its left.` : `At ${n.v}. Walk its left subtree first.`, at(id))
    }
    yield* go(n.l)
    if (order === 'inorder') { emit(n); yield frame(outLine, `Left side done: output ${n.v}${n.r === null ? '.' : ', then go right.'}`, at(id)) }
    if (order === 'postorder' && n.r !== null) yield frame(3, `Back at ${n.v}. Now its right subtree.`, at(id))
    yield* go(n.r)
    if (order === 'postorder') { emit(n); yield frame(outLine, `Both sides done: output ${n.v}.`, at(id)) }
    stack.pop()
  }
  yield* go(g.root)
  yield frame(-1, order === 'inorder'
    ? 'In-order reads a search tree out sorted, smallest to largest: the order it keeps.'
    : order === 'preorder'
      ? 'Pre-order lists every node before its children. Planting these values in this order grows the same tree again.'
      : 'Post-order lists every node after its children: the order to take a tree apart in, leaves first.',
  { out: [...out], done: [...done] })
}

function* levelOrder(t: Tree): BGen {
  const counts = { visits: 0 }
  const { g, frame } = grower(t, counts)
  const out: number[] = [], done: number[] = []
  const queue: number[] = g.root === null ? [] : [g.root]
  yield frame(0, 'Level order: a queue keeps the nodes waiting, so the tree is read a level at a time.', { queue: [...queue], out: [], done: [] })
  while (queue.length) {
    const id = queue.shift()!
    const n = g.get(id)
    out.push(n.v); done.push(id); counts.visits++
    yield frame(3, `Take ${n.v} from the front of the queue and output it.`, { at: id, queue: [...queue], out: [...out], done: [...done] })
    const kids = [n.l, n.r].filter((k): k is number => k !== null)
    queue.push(...kids)
    yield frame(4, kids.length ? `Queue its children at the back: ${kids.map((k) => g.get(k).v).join(' and ')}.` : `${n.v} has no children to queue.`, { at: id, queue: [...queue], out: [...out], done: [...done] })
  }
  yield frame(-1, 'Every node, top to bottom and left to right: level order.', { out: [...out], done: [...done] })
}

export function runBst(t: Tree, op: BstOp, v = 0): BGen {
  switch (op) {
    case 'insert': return insert(t, v)
    case 'search': return search(t, v)
    case 'delete': return remove(t, v)
    case 'level': return levelOrder(t)
    case 'sorted': return sorted(t.next, sortedValues(t))
    default: return depthFirst(t, op)
  }
}

// The sorted run uses the tree's own values when there are few enough to
// stack up legibly, so the same values can be seen growing a different tree.
function sortedValues(t: Tree) {
  const vs = values(t).sort((a, b) => a - b)
  return vs.length >= 3 && vs.length <= 9 ? vs : [12, 23, 34, 45, 56, 67, 78, 89]
}

// The tree a recording leaves behind, ready for the next operation.
export function after(frames: Frame<BstState>[]): Tree {
  const { root, nodes, next } = frames[frames.length - 1].state
  return { root, nodes, next }
}

export function idleBst(t: Tree, note: string): Frame<BstState> {
  return grower(t, { comparisons: 0 }).frame(-1, note)
}

/* ---------- Min-heap ---------- */

export type Item = { id: number; v: number }
export type Heap = Item[]
export type HeapState = {
  a: Item[]
  at?: number // the index the running line is touching
  cmp?: number[] // indices being compared
  move?: number[] // indices just swapped or moved
  par?: number // the parent whose child arrows are lit
  taken?: number // the value an extract took out
}
export type HeapOp = 'push' | 'pop' | 'heapify'
type HGen = Generator<Frame<HeapState>, void>
type HMake = (line: number, note: string, extra?: Partial<HeapState>) => Frame<HeapState>

export const HEAP_CODE: Record<HeapOp, string[]> = {
  push: [
    'push(v):',
    '  append v at the end; i = its index',
    '  while i > 0:',
    '    p = (i - 1) / 2',
    '    if a[p] <= a[i]: stop',
    '    swap a[p], a[i]; i = p',
  ],
  pop: [
    'pop():',
    '  min = a[0]',
    '  a[0] = the last element, removed',
    '  i = 0',
    '  while i has a child:',
    '    c = the smaller child of i',
    '    if a[i] <= a[c]: stop',
    '    swap a[i], a[c]; i = c',
    '  return min',
  ],
  heapify: [
    'heapify(a):',
    '  for i from n/2 - 1 down to 0:',
    '    while i has a child:',
    '      c = the smaller child of i',
    '      if a[i] <= a[c]: stop',
    '      swap a[i], a[c]; i = c',
  ],
}

export const HEAP_MAX = 15

function heaper(h: Heap, counts: Counts) {
  const a = h.slice()
  const frame: HMake = (line, note, extra = {}) => ({ state: { a: a.slice(), ...extra }, line, note, counts: { ...counts, size: a.length } })
  const swap = (i: number, j: number) => { [a[i], a[j]] = [a[j], a[i]]; counts.swaps++ }
  return { a, frame, swap }
}

// Sifts a[i] down until both its children are at least as big. `base` is
// the line of the loop in whichever listing is showing.
function* siftDown(a: Item[], i: number, counts: Counts, frame: HMake, swap: (i: number, j: number) => void, base: number): HGen {
  for (;;) {
    const l = 2 * i + 1, r = l + 1
    if (l >= a.length) {
      yield frame(base, `Index ${i} has no children: ${a[i].v} settles here.`, { at: i })
      return
    }
    let c = l
    if (r < a.length) {
      counts.comparisons++
      c = a[r].v < a[l].v ? r : l
      yield frame(base + 1, `Children of ${i} sit at 2·${i}+1 = ${l} and 2·${i}+2 = ${r}. The smaller is ${a[c].v}.`, { at: i, cmp: [l, r], par: i })
    } else {
      yield frame(base + 1, `Index ${i} has one child, at 2·${i}+1 = ${l}: ${a[l].v}.`, { at: i, cmp: [l], par: i })
    }
    counts.comparisons++
    if (a[i].v <= a[c].v) {
      yield frame(base + 2, `${a[i].v} ≤ ${a[c].v}: the parent is no bigger, so it stays.`, { at: i, cmp: [i, c], par: i })
      return
    }
    yield frame(base + 2, `${a[i].v} > ${a[c].v}: the parent is bigger.`, { at: i, cmp: [i, c], par: i })
    swap(i, c)
    yield frame(base + 3, `Swap them: ${a[i].v} rises, ${a[c].v} sinks to index ${c}.`, { at: c, move: [i, c] })
    i = c
  }
}

function* push(h: Heap, v: number): HGen {
  const counts = { comparisons: 0, swaps: 0 }
  const { a, frame, swap } = heaper(h, counts)
  a.push({ id: nextId(h), v })
  let i = a.length - 1
  yield frame(1, `Push ${v}: it goes on the end, at index ${i}, the next free place in the bottom row.`, { at: i, move: [i] })
  while (i > 0) {
    const p = (i - 1) >> 1
    yield frame(3, `Its parent is at (${i} − 1) / 2 = ${p}, holding ${a[p].v}.`, { at: i, cmp: [p, i], par: p })
    counts.comparisons++
    if (a[p].v <= a[i].v) {
      yield frame(4, `${a[p].v} ≤ ${a[i].v}: the parent is no bigger, so ${a[i].v} stays.`, { at: i, cmp: [p, i], par: p })
      break
    }
    swap(p, i)
    yield frame(5, `${a[i].v} > ${a[p].v}: swap, and ${a[p].v} climbs to index ${p}.`, { at: p, move: [p, i] })
    i = p
  }
  if (i === 0) yield frame(2, `${a[0].v} reached the root: it is the smallest now.`, { at: 0 })
  yield frame(-1, `Heap order holds again. The smallest, ${a[0].v}, is at the root.`)
}

function* pop(h: Heap): HGen {
  const counts = { comparisons: 0, swaps: 0 }
  const { a, frame, swap } = heaper(h, counts)
  if (!a.length) { yield frame(1, 'The heap is empty: nothing to take.'); return }
  const min = a[0].v
  yield frame(1, `The smallest is always at the root: take ${min}.`, { at: 0, move: [0] })
  const last = a.pop()!
  if (!a.length) { yield frame(8, `${min} was the only value. The heap is empty.`, { taken: min }); return }
  a[0] = last
  yield frame(2, `Fill the hole with the last element: ${last.v} jumps from the bottom row to the root.`, { at: 0, move: [0], taken: min })
  yield frame(3, `${last.v} is probably too big for the root. Sift it down.`, { at: 0, taken: min })
  yield* siftDown(a, 0, counts, (l, n, x) => frame(l, n, { ...x, taken: min }), swap, 4)
  yield frame(8, `Return ${min}. The new smallest, ${a[0].v}, has risen to the root.`, { taken: min })
}

function* heapify(h: Heap): HGen {
  const counts = { comparisons: 0, swaps: 0 }
  const { a, frame, swap } = heaper(h, counts)
  yield frame(-1, `${a.length} values in random order, drawn as a tree. It is not a heap yet.`)
  for (let i = (a.length >> 1) - 1; i >= 0; i--) {
    yield frame(1, i === (a.length >> 1) - 1 ? `Leaves are heaps already. Start at the last parent, index ${i}, and sift it down.` : `Next parent back: index ${i}, holding ${a[i].v}.`, { at: i })
    yield* siftDown(a, i, counts, frame, swap, 2)
  }
  yield frame(-1, `Every parent is now no bigger than its children: a heap, built bottom-up in linear time.`)
}

export function runHeap(h: Heap, op: HeapOp, v = 0): HGen {
  return op === 'push' ? push(h, v) : op === 'pop' ? pop(h) : heapify(h)
}

// Items keep their ids for as long as they live, and new ones never reuse
// an id still on the stage, so nothing slides in from a stranger's place.
export const nextId = (h: Heap) => h.reduce((m, x) => Math.max(m, x.id), 0) + 1
export const items = (vals: number[], from: number): Heap => vals.map((v, i) => ({ id: from + i, v }))

// A heap built straight from values with no recording, for the first view.
export function heapOf(vals: number[]): Heap {
  const counts = { comparisons: 0, swaps: 0 }
  const { a, frame, swap } = heaper(items(vals, 1), counts)
  for (let i = (a.length >> 1) - 1; i >= 0; i--) for (const f of siftDown(a, i, counts, frame, swap, 0)) void f
  return a
}

export function idleHeap(h: Heap, note: string): Frame<HeapState> {
  return heaper(h, { comparisons: 0, swaps: 0 }).frame(-1, note)
}
