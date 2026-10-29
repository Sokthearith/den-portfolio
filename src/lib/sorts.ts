import type { Counts, Frame } from './algo'

// Six sorts, each recorded as frames over a row of buildings. A building
// keeps its id as it moves, so the stage can slide it to its new place.
export type Block = { id: number; h: number }
export type SortState = {
  a: Block[]
  cmp?: number[] // positions being compared
  move?: number[] // positions just swapped or written
  pivot?: number // quick sort's pivot, selection sort's smallest so far
  range?: [number, number] // the part being worked on, where that matters
  sorted: number[] // positions known to be final
}
export type SortId = 'bubble' | 'insertion' | 'selection' | 'merge' | 'quick' | 'heap'
type Gen = Generator<Frame<SortState>, void>

export const SORTS: { id: SortId; name: string; code: string[] }[] = [
  { id: 'bubble', name: 'Bubble', code: [
    'for end from n-1 down to 1:',
    '  for j from 0 to end-1:',
    '    if a[j] > a[j+1]:',
    '      swap a[j], a[j+1]',
    '  a[end] is in place',
  ] },
  { id: 'insertion', name: 'Insertion', code: [
    'for i from 1 to n-1:',
    '  j = i',
    '  while j > 0 and a[j-1] > a[j]:',
    '    swap a[j-1], a[j]',
    '    j = j - 1',
  ] },
  { id: 'selection', name: 'Selection', code: [
    'for i from 0 to n-2:',
    '  min = i',
    '  for j from i+1 to n-1:',
    '    if a[j] < a[min]: min = j',
    '  swap a[i], a[min]',
  ] },
  { id: 'merge', name: 'Merge', code: [
    'sort(lo, hi):',
    '  if lo >= hi: return',
    '  mid = (lo + hi) / 2',
    '  sort(lo, mid); sort(mid+1, hi)',
    '  while both halves have some left:',
    '    take the shorter front',
    '  take whatever is left',
  ] },
  { id: 'quick', name: 'Quick', code: [
    'quick(lo, hi):',
    '  if lo >= hi: return',
    '  pivot = a[hi]; i = lo',
    '  for j from lo to hi-1:',
    '    if a[j] < pivot:',
    '      swap a[i], a[j]; i = i + 1',
    '  swap a[i], a[hi]',
    '  quick(lo, i-1); quick(i+1, hi)',
  ] },
  { id: 'heap', name: 'Heap', code: [
    'build a max-heap in a',
    'for end from n-1 down to 1:',
    '  swap a[0], a[end]',
    '  sift a[0] down in a[0..end-1]:',
    '    child = the taller child',
    '    if child > parent: swap them',
  ] },
]

// A shuffled town of n buildings with distinct heights 1..n.
export function town(n: number, random: () => number): Block[] {
  const a = Array.from({ length: n }, (_, i) => ({ id: i, h: i + 1 }))
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

// Every generator keeps its own array and counts and yields copies of them.
function recorder(input: Block[], counts: Counts) {
  const a = input.slice()
  const sorted = new Set<number>()
  const frame = (line: number, note: string, extra: Partial<SortState> = {}): Frame<SortState> =>
    ({ state: { a: a.slice(), sorted: [...sorted], ...extra }, line, note, counts: { ...counts } })
  const swap = (i: number, j: number) => { [a[i], a[j]] = [a[j], a[i]]; counts.swaps++ }
  const finish = (): Frame<SortState> => { a.forEach((_, i) => sorted.add(i)); return frame(-1, 'Sorted. Every light in the town is on.') }
  return { a, sorted, frame, swap, finish }
}

function* bubble(input: Block[]): Gen {
  const counts = { comparisons: 0, swaps: 0 }
  const { a, sorted, frame, swap, finish } = recorder(input, counts)
  yield frame(-1, 'A town, out of order. Bubble sort walks it pair by pair.')
  for (let end = a.length - 1; end > 0; end--) {
    let swapped = false
    for (let j = 0; j < end; j++) {
      counts.comparisons++
      yield frame(2, `Is ${a[j].h} taller than ${a[j + 1].h}?`, { cmp: [j, j + 1] })
      if (a[j].h > a[j + 1].h) {
        swap(j, j + 1)
        swapped = true
        yield frame(3, 'It is: swap them, so the taller one moves right.', { move: [j, j + 1] })
      }
    }
    sorted.add(end)
    yield frame(4, `The tallest left has bubbled to the end. ${a[end].h} is in place.`)
    if (!swapped) break // a pass with no swaps: the rest is already in order
  }
  yield finish()
}

function* insertion(input: Block[]): Gen {
  const counts = { comparisons: 0, swaps: 0 }
  const { a, frame, swap, finish } = recorder(input, counts)
  yield frame(-1, 'A town, out of order. Insertion sort grows a sorted street from the left.')
  for (let i = 1; i < a.length; i++) {
    let j = i
    yield frame(1, `Take ${a[i].h} and walk it left into the sorted part.`, { pivot: i, range: [0, i] })
    for (;;) {
      if (j === 0) break
      counts.comparisons++
      yield frame(2, `Is ${a[j - 1].h} taller than ${a[j].h}?`, { cmp: [j - 1, j], range: [0, i] })
      if (a[j - 1].h <= a[j].h) break
      swap(j - 1, j)
      j--
      yield frame(3, 'It is: step left past it.', { move: [j, j + 1], range: [0, i] })
    }
  }
  yield finish()
}

function* selection(input: Block[]): Gen {
  const counts = { comparisons: 0, swaps: 0 }
  const { a, sorted, frame, swap, finish } = recorder(input, counts)
  yield frame(-1, 'A town, out of order. Selection sort finds the shortest left, again and again.')
  for (let i = 0; i < a.length - 1; i++) {
    let min = i
    yield frame(1, `The shortest so far is ${a[i].h}.`, { pivot: min })
    for (let j = i + 1; j < a.length; j++) {
      counts.comparisons++
      yield frame(3, `Is ${a[j].h} shorter than ${a[min].h}?`, { cmp: [j, min], pivot: min })
      if (a[j].h < a[min].h) { min = j; yield frame(3, `Yes: ${a[min].h} is the shortest so far.`, { pivot: min }) }
    }
    if (min !== i) { swap(i, min); yield frame(4, `Swap it to the front of what is left.`, { move: [i, min] }) }
    sorted.add(i)
    yield frame(4, `${a[i].h} is in place.`)
  }
  yield finish()
}

function* merge(input: Block[]): Gen {
  const counts = { comparisons: 0, writes: 0 }
  const { a, frame, finish } = recorder(input, counts)
  yield frame(-1, 'A town, out of order. Merge sort splits it down to single buildings, then merges.')
  function* sort(lo: number, hi: number): Gen {
    if (lo >= hi) return
    const mid = Math.floor((lo + hi) / 2)
    yield frame(2, `Split ${lo}–${hi} into two halves.`, { range: [lo, hi] })
    yield* sort(lo, mid)
    yield* sort(mid + 1, hi)
    // Merging rewrites a[lo..hi] one building at a time; every frame is
    // still a full row: what is placed, then what is left of each half.
    const left = a.slice(lo, mid + 1), right = a.slice(mid + 1, hi + 1)
    const placed: Block[] = []
    const lay = () => { const row = [...placed, ...left, ...right]; for (let k = 0; k < row.length; k++) a[lo + k] = row[k] }
    while (left.length && right.length) {
      const li = lo + placed.length, ri = li + left.length
      counts.comparisons++
      yield frame(5, `Which front is shorter, ${left[0].h} or ${right[0].h}?`, { cmp: [li, ri], range: [lo, hi] })
      placed.push(left[0].h <= right[0].h ? left.shift()! : right.shift()!)
      counts.writes++
      lay()
      yield frame(5, `${placed[placed.length - 1].h} goes next.`, { move: [lo + placed.length - 1], range: [lo, hi] })
    }
    if (left.length || right.length) {
      counts.writes += left.length + right.length
      placed.push(...left.splice(0), ...right.splice(0))
      lay()
      yield frame(6, 'One half is used up: the rest of the other follows as it is.', { range: [lo, hi] })
    }
  }
  yield* sort(0, a.length - 1)
  yield finish()
}

function* quick(input: Block[]): Gen {
  const counts = { comparisons: 0, swaps: 0 }
  const { a, sorted, frame, swap, finish } = recorder(input, counts)
  yield frame(-1, 'A town, out of order. Quick sort picks a pivot and splits the town round it.')
  function* go(lo: number, hi: number): Gen {
    if (lo > hi) return
    if (lo === hi) { sorted.add(lo); yield frame(1, `${a[lo].h} stands alone: it is in place.`); return }
    const pivot = a[hi].h
    let i = lo
    yield frame(2, `The pivot is ${pivot}. Shorter ones go to its left.`, { pivot: hi, range: [lo, hi] })
    for (let j = lo; j < hi; j++) {
      counts.comparisons++
      yield frame(4, `Is ${a[j].h} shorter than ${pivot}?`, { cmp: [j], pivot: hi, range: [lo, hi] })
      if (a[j].h < pivot) {
        if (i !== j) { swap(i, j); yield frame(5, 'It is: move it into the shorter side.', { move: [i, j], pivot: hi, range: [lo, hi] }) }
        i++
      }
    }
    if (i !== hi) swap(i, hi)
    sorted.add(i)
    yield frame(6, `The pivot ${pivot} drops into its place.`, { move: [i, hi], range: [lo, hi] })
    yield* go(lo, i - 1)
    yield* go(i + 1, hi)
  }
  yield* go(0, a.length - 1)
  yield finish()
}

function* heap(input: Block[]): Gen {
  const counts = { comparisons: 0, swaps: 0 }
  const { a, sorted, frame, swap, finish } = recorder(input, counts)
  yield frame(-1, 'A town, out of order. Heap sort first arranges it as a heap, tallest at the front.')
  function* sift(i: number, n: number, line: number): Gen {
    for (;;) {
      const l = 2 * i + 1, r = l + 1
      if (l >= n) return
      let child = l
      if (r < n) {
        counts.comparisons++
        yield frame(line, `Which child of ${a[i].h} is taller, ${a[l].h} or ${a[r].h}?`, { cmp: [l, r], pivot: i, range: [0, n - 1] })
        if (a[r].h > a[l].h) child = r
      }
      counts.comparisons++
      yield frame(5, `Is ${a[child].h} taller than its parent ${a[i].h}?`, { cmp: [child, i], range: [0, n - 1] })
      if (a[child].h <= a[i].h) return
      swap(i, child)
      yield frame(5, 'It is: they trade places.', { move: [i, child], range: [0, n - 1] })
      i = child
    }
  }
  for (let i = Math.floor(a.length / 2) - 1; i >= 0; i--) yield* sift(i, a.length, 0)
  yield frame(0, `A max-heap: ${a[0].h}, the tallest, is at the front.`)
  for (let end = a.length - 1; end > 0; end--) {
    swap(0, end)
    sorted.add(end)
    yield frame(2, `Move the tallest, ${a[end].h}, to the end. It is in place.`, { move: [0, end] })
    yield* sift(0, end, 4)
  }
  yield finish()
}

export const RUNS: Record<SortId, (input: Block[]) => Gen> = { bubble, insertion, selection, merge, quick, heap }
