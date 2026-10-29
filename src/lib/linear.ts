import type { Counts, Frame } from './algo'

// Three linear structures, each operation recorded as frames: a stack of
// records on a spindle, a queue at the cinema with the ring buffer that holds
// it, and a string of lamps joined by `next` wires. Every item keeps its id
// as it moves, so the stage can slide it rather than redraw it.
export type Item = { id: number; v: number }
type Gen<S> = Generator<Frame<S>, void>

// Values for the seeded starting structures, 1..99.
export function values(n: number, random: () => number): number[] {
  return Array.from({ length: n }, () => 1 + Math.floor(random() * 99))
}

/* ---------- The stack ---------- */

export const STACK_CAP = 8
export type StackData = { items: Item[]; seq: number }
export type StackState = StackData & {
  top: number
  hover?: Item // a record held above the spindle: arriving, or just lifted off
  out?: Item // the record pop handed back, set aside in the tray
  outLit?: boolean // the line is returning it
  lit?: number // the slot the running line is touching
  ptr?: boolean // the line is reading or moving `top` itself
  error?: string
}
export type StackOp = 'push' | 'pop' | 'peek'

export const STACK_CODE: Record<StackOp, string[]> = {
  push: [
    'push(x):',
    '  if top == CAP - 1:',
    '    error "stack overflow"',
    '  top = top + 1',
    '  stack[top] = x',
  ],
  pop: [
    'pop():',
    '  if top == -1:',
    '    error "stack underflow"',
    '  x = stack[top]',
    '  top = top - 1',
    '  return x',
  ],
  peek: [
    'peek():',
    '  if top == -1:',
    '    error "stack is empty"',
    '  return stack[top]',
  ],
}

export function seedStack(random: () => number): StackData {
  return { items: values(4, random).map((v, id) => ({ id, v })), seq: 4 }
}

export function stackIdle(d: StackData): Frame<StackState> {
  return {
    state: { ...d, top: d.items.length - 1 },
    line: -1,
    note: `${d.items.length} records on the spindle. Only the top one is in reach: push puts one on, pop takes one off.`,
    counts: { size: d.items.length, top: d.items.length - 1, steps: 0 },
  }
}

// Each stack operation keeps its own copy of the pile and counts its steps:
// one for the check, one for moving `top`, one for the read or write.
function stackRecorder(d: StackData, seq = d.seq) {
  const items = d.items.slice()
  const c = { top: items.length - 1, steps: 0 }
  const frame = (line: number, note: string, extra: Partial<StackState> = {}): Frame<StackState> =>
    ({ state: { items: items.slice(), seq, top: c.top, ...extra }, line, note, counts: { size: items.length, top: c.top, steps: c.steps } })
  return { items, c, frame }
}

function* push(d: StackData, v: number): Gen<StackState> {
  const rec = { id: d.seq, v }
  const { items, c, frame } = stackRecorder(d, d.seq + 1)
  yield frame(0, `push(${v}): a new record comes down to the spindle.`, { hover: rec })
  c.steps++
  if (c.top === STACK_CAP - 1) {
    yield frame(1, `Is top at the last slot? top is ${c.top}: the spindle is full.`, { hover: rec, ptr: true })
    yield frame(2, `Stack overflow. There is no ninth slot, so ${v} is turned away and nothing changes.`, { hover: rec, error: 'Stack overflow' })
    return
  }
  yield frame(1, `Is top at the last slot? top is ${c.top}, the last is ${STACK_CAP - 1}: there is room.`, { hover: rec, ptr: true })
  c.top++
  c.steps++
  yield frame(3, `top moves up to slot ${c.top}.`, { hover: rec, ptr: true })
  items.push(rec)
  c.steps++
  yield frame(4, `stack[${c.top}] = ${v}: the record drops onto the pile.`, { lit: c.top })
  yield frame(-1, `${v} is on top. Three steps, however tall the pile: push never looks below the top.`)
}

function* pop(d: StackData): Gen<StackState> {
  const { items, c, frame } = stackRecorder(d)
  yield frame(0, 'pop(): take the top record off.')
  c.steps++
  if (c.top === -1) {
    yield frame(1, 'Is top -1? It is: the spindle is empty.', { ptr: true })
    yield frame(2, 'Stack underflow. There is no record to take, so pop has nothing to return.', { error: 'Stack underflow', ptr: true })
    return
  }
  yield frame(1, `Is top -1? No, top is ${c.top}.`, { ptr: true })
  const rec = items[c.top]
  c.steps++
  yield frame(3, `x = stack[${c.top}], which is ${rec.v}.`, { lit: c.top })
  items.pop()
  c.top--
  c.steps++
  yield frame(4, `top moves down to ${c.top}, and ${rec.v} lifts off the spindle.`, { hover: rec, ptr: true })
  yield frame(5, `return ${rec.v}.`, { out: rec, outLit: true })
  yield frame(-1, `Popped ${rec.v}. Last on, first off: the record pushed most recently always leaves first.`, { out: rec })
}

function* peek(d: StackData): Gen<StackState> {
  const { items, c, frame } = stackRecorder(d)
  yield frame(0, 'peek(): read the top record without taking it.')
  c.steps++
  if (c.top === -1) {
    yield frame(1, 'Is top -1? It is: the spindle is empty.', { ptr: true })
    yield frame(2, 'The stack is empty, so there is nothing on top to read.', { error: 'Stack is empty', ptr: true })
    return
  }
  yield frame(1, `Is top -1? No, top is ${c.top}.`, { ptr: true })
  c.steps++
  yield frame(3, `return stack[${c.top}]: ${items[c.top].v}. The record stays where it is.`, { lit: c.top })
}

export const STACK_RUNS = {
  push: (d: StackData, v: number) => push(d, v),
  pop: (d: StackData) => pop(d),
  peek: (d: StackData) => peek(d),
}

/* ---------- The queue ---------- */

// The queue lives in a ring buffer of eight slots. `head` and `tail` are kept
// as running totals so a marker that wraps keeps turning the same way round;
// the slot each one names is the total modulo the capacity.
export const QUEUE_CAP = 8
export type QueueData = { buf: (Item | null)[]; head: number; tail: number; size: number; seq: number }
export type QueueState = QueueData & {
  arriving?: Item // walking in to join the back
  serving?: Item // at the booth window, getting a ticket
  leaving?: Item // walking away with it
  lit?: number // the slot the running line is touching
  ptr?: 'head' | 'tail'
  error?: string
}
export type QueueOp = 'enqueue' | 'dequeue'

export const QUEUE_CODE: Record<QueueOp, string[]> = {
  enqueue: [
    'enqueue(x):',
    '  if size == CAP:',
    '    error "queue is full"',
    '  buf[tail] = x',
    '  tail = (tail + 1) % CAP',
    '  size = size + 1',
  ],
  dequeue: [
    'dequeue():',
    '  if size == 0:',
    '    error "queue is empty"',
    '  x = buf[head]',
    '  buf[head] = empty',
    '  head = (head + 1) % CAP',
    '  size = size - 1',
    '  return x',
  ],
}

// The line starts part way round the ring, as if the evening had already
// begun: the first person to join fills the last slot and `tail` wraps.
export function seedQueue(random: () => number): QueueData {
  const buf: (Item | null)[] = Array(QUEUE_CAP).fill(null)
  const head = 4
  values(3, random).forEach((v, id) => { buf[(head + id) % QUEUE_CAP] = { id, v } })
  return { buf, head, tail: head + 3, size: 3, seq: 3 }
}

export function queueIdle(d: QueueData): Frame<QueueState> {
  const h = d.head % QUEUE_CAP, t = d.tail % QUEUE_CAP
  return {
    state: d,
    line: -1,
    note: `${d.size} people in line. They join at the back and are served at the front, while underneath, head and tail chase each other round a ring of ${QUEUE_CAP} slots.`,
    counts: { size: d.size, head: h, tail: t, steps: 0 },
  }
}

function queueRecorder(d: QueueData, seq = d.seq) {
  const s = { buf: d.buf.slice(), head: d.head, tail: d.tail, size: d.size }
  const c = { steps: 0 }
  const frame = (line: number, note: string, extra: Partial<QueueState> = {}): Frame<QueueState> => ({
    state: { buf: s.buf.slice(), head: s.head, tail: s.tail, size: s.size, seq, ...extra },
    line,
    note,
    counts: { size: s.size, head: s.head % QUEUE_CAP, tail: s.tail % QUEUE_CAP, steps: c.steps },
  })
  return { s, c, frame }
}

function* enqueue(d: QueueData, v: number): Gen<QueueState> {
  const p = { id: d.seq, v }
  const { s, c, frame } = queueRecorder(d, d.seq + 1)
  yield frame(0, `enqueue(${v}): someone new arrives at the cinema.`, { arriving: p })
  c.steps++
  if (s.size === QUEUE_CAP) {
    yield frame(1, `Is size ${QUEUE_CAP}? It is: every slot in the buffer is taken.`, { arriving: p })
    yield frame(2, `The queue is full, so ${v} is turned away. In a ring, full means tail has come all the way round to head.`, { arriving: p, error: 'Queue is full' })
    return
  }
  yield frame(1, `Is size ${QUEUE_CAP}? No, it is ${s.size}: there is room.`, { arriving: p })
  const t = s.tail % QUEUE_CAP
  s.buf[t] = p
  c.steps++
  yield frame(3, `buf[${t}] = ${v}: they join the back of the line, into the slot tail names.`, { lit: t })
  s.tail++
  c.steps++
  yield frame(4, t === QUEUE_CAP - 1
    ? `tail = (${t} + 1) % ${QUEUE_CAP} = 0. Past the last slot, tail wraps round to the first: that is the whole trick of a ring.`
    : `tail = (${t} + 1) % ${QUEUE_CAP} = ${t + 1}.`, { ptr: 'tail' })
  s.size++
  c.steps++
  yield frame(5, `size = ${s.size}.`, { ptr: 'tail' })
  yield frame(-1, `${v} waits at the back. Joining took ${c.steps} steps, however long the line.`)
}

function* dequeue(d: QueueData): Gen<QueueState> {
  const { s, c, frame } = queueRecorder(d)
  yield frame(0, 'dequeue(): the front of the line steps up to the booth.')
  c.steps++
  if (s.size === 0) {
    yield frame(1, 'Is size 0? It is: nobody is waiting.')
    yield frame(2, 'The queue is empty, so there is no one to serve. Empty means head has caught up with tail.', { error: 'Queue is empty' })
    return
  }
  yield frame(1, `Is size 0? No, ${s.size} ${s.size === 1 ? 'person is' : 'people are'} waiting.`)
  const h = s.head % QUEUE_CAP
  const p = s.buf[h]!
  c.steps++
  yield frame(3, `x = buf[${h}]: ${p.v} is at the front, and gets a ticket.`, { lit: h, serving: p })
  s.buf[h] = null
  c.steps++
  yield frame(4, `buf[${h}] = empty. ${p.v} leaves; everyone in the line steps forward, but nothing in the buffer moves.`, { lit: h, leaving: p })
  s.head++
  c.steps++
  yield frame(5, h === QUEUE_CAP - 1
    ? `head = (${h} + 1) % ${QUEUE_CAP} = 0. head wraps round to the first slot, following tail.`
    : `head = (${h} + 1) % ${QUEUE_CAP} = ${h + 1}. Only the marker moves on.`, { ptr: 'head' })
  s.size--
  c.steps++
  yield frame(6, `size = ${s.size}.`, { ptr: 'head' })
  yield frame(7, `return ${p.v}.`)
  yield frame(-1, `Served ${p.v}. First in, first out, in ${c.steps} steps: no one in the buffer had to shuffle up.`)
}

export const QUEUE_RUNS = {
  enqueue: (d: QueueData, v: number) => enqueue(d, v),
  dequeue: (d: QueueData) => dequeue(d),
}

/* ---------- The linked list ---------- */

// A pointer the code holds: a lamp's id, or null, drawn either before the
// head ('start') or past the last lamp ('end').
export const LIST_CAP = 8
export type Ptr = number | 'start' | 'end'
export type Tag = { name: string; at: Ptr }
export type ListData = { nodes: Item[]; seq: number }
export type ListState = ListData & {
  next: Record<number, number | null> // each lamp's wire
  head: number | null
  off?: number // a lamp held out of the string: new, or being taken down
  gone?: boolean // the held lamp is leaving
  tags: Tag[]
  lit?: number // the lamp the running line is touching
  seen: number[] // lamps the cursor has already passed
  wire?: number | 'head' // the wire just written
  error?: string
}
export type ListOp = 'insert' | 'delete' | 'search' | 'reverse'

export const LIST_CODE: Record<ListOp, string[]> = {
  insert: [
    'insert(i, x):',
    '  node = new Lamp(x)',
    '  if i == 0:',
    '    node.next = head',
    '    head = node',
    '    return',
    '  prev = head',
    '  repeat i - 1 times:',
    '    prev = prev.next',
    '  node.next = prev.next',
    '  prev.next = node',
  ],
  delete: [
    'delete(i):',
    '  if i == 0:',
    '    head = head.next',
    '    return',
    '  prev = head',
    '  repeat i - 1 times:',
    '    prev = prev.next',
    '  gone = prev.next',
    '  prev.next = gone.next',
  ],
  search: [
    'search(x):',
    '  curr = head; i = 0',
    '  while curr != null:',
    '    if curr.value == x: return i',
    '    curr = curr.next; i = i + 1',
    '  return -1',
  ],
  reverse: [
    'reverse():',
    '  prev = null; curr = head',
    '  while curr != null:',
    '    next = curr.next',
    '    curr.next = prev',
    '    prev = curr',
    '    curr = next',
    '  head = prev',
  ],
}

export function seedList(random: () => number): ListData {
  return { nodes: values(5, random).map((v, id) => ({ id, v })), seq: 5 }
}

// Wires that follow the order the lamps hang in, the last one to null.
export function chain(nodes: Item[]): Record<number, number | null> {
  const next: Record<number, number | null> = {}
  nodes.forEach((n, k) => { next[n.id] = nodes[k + 1]?.id ?? null })
  return next
}

export function listIdle(d: ListData): Frame<ListState> {
  return {
    state: { ...d, next: chain(d.nodes), head: d.nodes[0]?.id ?? null, tags: [], seen: [] },
    line: -1,
    note: `${d.nodes.length} lamps on a wire. Each one knows only the next, so reaching index i means walking there from the head.`,
    counts: { hops: 0, rewires: 0, length: d.nodes.length },
  }
}

// A list operation keeps its own lamps, wires and cursor, and yields copies.
function listRecorder(d: ListData, counts: Counts, seq = d.seq) {
  const s = { nodes: d.nodes.slice(), next: chain(d.nodes), head: (d.nodes[0]?.id ?? null) as number | null, seen: [] as number[] }
  const frame = (line: number, note: string, extra: Partial<ListState> = {}): Frame<ListState> => ({
    state: { nodes: s.nodes.slice(), next: { ...s.next }, head: s.head, seen: s.seen.slice(), tags: [], seq, ...extra },
    line,
    note,
    counts: { ...counts, length: s.nodes.length },
  })
  const val = (id: number | null) => (id === null ? 'null' : String(s.nodes.find((n) => n.id === id)!.v))
  return { s, frame, val }
}

function* insert(d: ListData, i: number, v: number): Gen<ListState> {
  const counts = { hops: 0, rewires: 0 }
  const node = { id: d.seq, v }
  const { s, frame, val } = listRecorder(d, counts, d.seq + 1)
  if (s.nodes.length >= LIST_CAP) {
    yield frame(0, `insert(${i}, ${v}): hang a new lamp at index ${i}.`)
    yield frame(-1, `The wire has hooks for ${LIST_CAP} lamps on this stage, and all of them are taken. A real list would simply grow.`, { error: 'The string is full' })
    return
  }
  yield frame(0, `insert(${i}, ${v}): hang a new lamp at index ${i}.`)
  s.nodes.splice(i, 0, node)
  s.next[node.id] = null
  const held = { off: node.id }
  yield frame(1, `node = a new lamp, ${v}. It waits above the string, its wire pointing at nothing yet.`, { ...held, lit: node.id })
  if (i === 0) {
    yield frame(2, 'i is 0: the new lamp goes in front of the head. No walking needed.', held)
    s.next[node.id] = s.head
    counts.rewires++
    yield frame(3, `node.next = head: its wire goes to ${val(s.head)}, the old first lamp.`, { ...held, wire: node.id, lit: node.id })
    s.head = node.id
    counts.rewires++
    yield frame(4, 'head = node: the head now points at the new lamp.', { ...held, wire: 'head' })
    yield frame(-1, `Hung at the front with 2 rewires and no walking: inserting at the head takes the same time on any length of string.`)
    return
  }
  yield frame(2, `i is ${i}, not 0: walk to the lamp just before index ${i}.`, held)
  let prev = s.head!
  s.seen.push(prev)
  yield frame(6, `prev = head: start at ${val(prev)}.`, { ...held, lit: prev, tags: [{ name: 'prev', at: prev }] })
  for (let k = 0; k < i - 1; k++) {
    prev = s.next[prev]!
    counts.hops++
    s.seen.push(prev)
    yield frame(8, `prev = prev.next: follow the wire on to ${val(prev)}.`, { ...held, lit: prev, tags: [{ name: 'prev', at: prev }] })
  }
  const after = s.next[prev]
  s.next[node.id] = after
  counts.rewires++
  yield frame(9, after === null
    ? 'node.next = prev.next, which is null: the new lamp will end the string.'
    : `node.next = prev.next: the new lamp's wire goes to ${val(after)} first. Rewired the other way round, the rest of the string would be lost.`,
  { ...held, wire: node.id, lit: node.id, tags: [{ name: 'prev', at: prev }] })
  s.next[prev] = node.id
  counts.rewires++
  yield frame(10, `prev.next = node: ${val(prev)}'s wire swings across to the new lamp.`, { ...held, wire: prev, lit: prev, tags: [{ name: 'prev', at: prev }] })
  yield frame(-1, `Hung at index ${i}. Walking there took ${counts.hops} ${counts.hops === 1 ? 'hop' : 'hops'}; the rewiring took 2, wherever it happens.`)
}

function* remove(d: ListData, i: number): Gen<ListState> {
  const counts = { hops: 0, rewires: 0 }
  const { s, frame, val } = listRecorder(d, counts)
  if (!s.nodes.length) {
    yield frame(0, `delete(${i}): take down the lamp at index ${i}.`)
    yield frame(-1, 'The string is empty: there is no lamp to take down.', { error: 'The string is empty' })
    return
  }
  yield frame(0, `delete(${i}): take down the lamp at index ${i}.`)
  // The lamp leaves the string in the last frame, once nothing points at it.
  const unhang = (id: number) => { s.nodes = s.nodes.filter((n) => n.id !== id); delete s.next[id] }
  if (i === 0) {
    const gone = s.head!
    yield frame(1, `i is 0: the head lamp, ${val(gone)}, comes down.`, { lit: gone })
    s.head = s.next[gone]
    counts.rewires++
    yield frame(2, `head = head.next: the head now points at ${val(s.head)}, and nothing points at ${val(gone)}.`, { wire: 'head', off: gone, gone: true })
    unhang(gone)
    yield frame(-1, 'Taken down from the front with one rewire and no walking.')
    return
  }
  let prev = s.head!
  s.seen.push(prev)
  yield frame(4, `prev = head: start at ${val(prev)}.`, { lit: prev, tags: [{ name: 'prev', at: prev }] })
  for (let k = 0; k < i - 1; k++) {
    prev = s.next[prev]!
    counts.hops++
    s.seen.push(prev)
    yield frame(6, `prev = prev.next: follow the wire on to ${val(prev)}.`, { lit: prev, tags: [{ name: 'prev', at: prev }] })
  }
  const gone = s.next[prev]!
  const tags = (): Tag[] => [{ name: 'prev', at: prev }, { name: 'gone', at: gone }]
  yield frame(7, `gone = prev.next: ${val(gone)} is the lamp to take down.`, { lit: gone, tags: tags() })
  s.next[prev] = s.next[gone]
  counts.rewires++
  yield frame(8, `prev.next = gone.next: ${val(prev)}'s wire skips past ${val(gone)} to ${val(s.next[gone])}.`, { wire: prev, lit: prev, off: gone, gone: true, tags: tags() })
  unhang(gone)
  yield frame(-1, `Taken down from index ${i}: ${counts.hops} ${counts.hops === 1 ? 'hop' : 'hops'} to find it, one rewire to let it go.`)
}

function* search(d: ListData, x: number): Gen<ListState> {
  const counts = { hops: 0, comparisons: 0 }
  const { s, frame, val } = listRecorder(d, counts)
  yield frame(0, `search(${x}): walk the string looking for ${x}.`)
  let curr: number | null = s.head
  let i = 0
  const at = (): Tag[] => [{ name: 'curr', at: curr ?? 'end' }]
  if (curr !== null) s.seen.push(curr)
  yield frame(1, curr === null ? 'curr = head, which is null: the string is empty.' : `curr = head: start at ${val(curr)}.`, { lit: curr ?? undefined, tags: at() })
  while (curr !== null) {
    yield frame(2, `curr is ${val(curr)}, not null: keep going.`, { lit: curr, tags: at() })
    counts.comparisons++
    if (s.nodes.find((n) => n.id === curr)!.v === x) {
      yield frame(3, `Is ${val(curr)} equal to ${x}? Yes: found at index ${i}.`, { lit: curr, tags: at() })
      yield frame(-1, `Found ${x} at index ${i} after ${counts.comparisons} ${counts.comparisons === 1 ? 'comparison' : 'comparisons'}. A list can only be searched by walking it.`, { lit: curr, tags: at() })
      return
    }
    yield frame(3, `Is ${val(curr)} equal to ${x}? No.`, { lit: curr, tags: at() })
    curr = s.next[curr]
    i++
    counts.hops++
    if (curr !== null) s.seen.push(curr)
    yield frame(4, curr === null ? 'curr = curr.next, which is null: the end of the string.' : `curr = curr.next: on to ${val(curr)}.`, { lit: curr ?? undefined, tags: at() })
  }
  yield frame(2, 'curr is null: there are no more lamps.', { tags: at() })
  yield frame(5, `return -1: ${x} is not on the string, and every lamp had to be checked to know it.`, { tags: at() })
}

function* reverse(d: ListData): Gen<ListState> {
  const counts = { hops: 0, rewires: 0 }
  const { s, frame, val } = listRecorder(d, counts)
  yield frame(0, 'reverse(): turn every wire round, one lamp at a time, without moving a lamp.')
  let prev: number | null = null
  let curr: number | null = s.head
  let next: number | null | undefined
  const tags = (): Tag[] => [
    { name: 'prev', at: prev ?? 'start' },
    { name: 'curr', at: curr ?? 'end' },
    ...(next === undefined ? [] : [{ name: 'next', at: next ?? 'end' } as Tag]),
  ]
  yield frame(1, curr === null ? 'prev = null; curr = head, which is null too: nothing to turn.' : `prev = null; curr = head, ${val(curr)}.`, { lit: curr ?? undefined, tags: tags() })
  while (curr !== null) {
    yield frame(2, `curr is ${val(curr)}, not null: turn its wire.`, { lit: curr, tags: tags() })
    next = s.next[curr]
    yield frame(3, `next = curr.next: remember ${val(next)} before the wire is cut.`, { lit: curr, tags: tags() })
    s.next[curr] = prev
    counts.rewires++
    yield frame(4, prev === null
      ? `curr.next = prev: ${val(curr)} will be the last lamp, so its wire now ends at null.`
      : `curr.next = prev: ${val(curr)}'s wire flips round to point back at ${val(prev)}.`, { lit: curr, wire: curr, tags: tags() })
    s.seen.push(curr)
    prev = curr
    yield frame(5, `prev = curr: ${val(prev)}.`, { lit: prev, tags: tags() })
    curr = next
    counts.hops++
    yield frame(6, curr === null ? 'curr = next, which is null: that was the last lamp.' : `curr = next: on to ${val(curr)}.`, { lit: curr ?? undefined, tags: tags() })
  }
  yield frame(2, 'curr is null: every wire has been turned.', { tags: tags() })
  s.head = prev
  yield frame(7, prev === null ? 'head = prev, still null.' : `head = prev: the head now points at ${val(prev)}, the old last lamp.`, { wire: 'head', tags: [{ name: 'prev', at: prev ?? 'start' }] })
  // The wires already run the new way; the string is hung again in that
  // order so it reads from the head, left to right.
  s.nodes.reverse()
  s.seen = []
  yield frame(-1, `Reversed with ${counts.rewires} rewires and no lamp moved. Hung again so it reads from the head.`)
}

export const LIST_RUNS = {
  insert: (d: ListData, i: number, v: number) => insert(d, i, v),
  delete: (d: ListData, i: number) => remove(d, i),
  search: (d: ListData, x: number) => search(d, x),
  reverse: (d: ListData) => reverse(d),
}
