import { useMemo, useState, type CSSProperties } from 'react'
import { record, seeded, useRun, SPEEDS, type Frame } from '../../lib/algo'
import { RUNS, SORTS, town, type Block, type SortId, type SortState } from '../../lib/sorts'
import { Action, Code, Controls, Picker, Readout } from './Deck'
import '../../styles/algo-sort.css'

// Sorting the skyline: the town's buildings are the numbers. The two being
// compared light up, a swap slides them past each other, and a building
// switches on all its windows once it stands in its final place. Race mode
// runs two sorts on the same town, step for step.
const SIZES = [{ id: '16', name: '16' }, { id: '32', name: '32' }, { id: '64', name: '64' }] as const
type Size = (typeof SIZES)[number]['id']
const SLOT = 20
const TALL = 260

type Race = { a: SortState; b: SortState; aEnd: number; bEnd: number }

// Two recordings as one, step for step; the one that finishes first holds
// its last frame while the other carries on.
function zip(fa: Frame<SortState>[], fb: Frame<SortState>[]): Frame<Race>[] {
  return Array.from({ length: Math.max(fa.length, fb.length) }, (_, k) => {
    const x = fa[Math.min(k, fa.length - 1)], y = fb[Math.min(k, fb.length - 1)]
    return { state: { a: x.state, b: y.state, aEnd: fa.length - 1, bEnd: fb.length - 1 }, line: -1, note: '', counts: {} }
  })
}

function Town({ state, n, speed, label }: { state: SortState; n: number; speed: number; label: string }) {
  const at = new Map(state.a.map((b, i) => [b.id, i]))
  const flag = (i: number) => {
    if (state.move?.includes(i)) return 'move'
    if (state.cmp?.includes(i)) return 'cmp'
    if (state.pivot === i) return 'pivot'
    return undefined
  }
  const sorted = new Set(state.sorted)
  const out = (i: number) => state.range && (i < state.range[0] || i > state.range[1])
  const unit = TALL / n
  // Slides keep up with the speed: quick at high speed, never slower than the step.
  const glide = Math.min(260, 900 / SPEEDS[speed])
  const ordered = [...state.a].sort((p, q) => p.id - q.id)
  return (
    <svg className="skyline" viewBox={`0 0 ${n * SLOT} ${TALL + 6}`} role="img" aria-label={label} style={{ '--glide': `${glide}ms` } as CSSProperties}>
      {ordered.map((b: Block) => {
        const i = at.get(b.id)!
        const h = b.h * unit
        const rows = Math.max(0, Math.floor((h - 8) / 10))
        return (
          <g key={b.id} className="skyline__b" data-flag={flag(i)} data-sorted={sorted.has(i) || undefined} data-out={out(i) || undefined} style={{ transform: `translateX(${i * SLOT}px)` }}>
            <rect className="skyline__body" x={2} y={TALL - h} width={SLOT - 4} height={h} />
            {Array.from({ length: rows }, (_, r) => [0, 1].map((c) => (
              <rect className="skyline__win" key={`${r}${c}`} x={5 + c * 6} y={TALL - h + 5 + r * 10} width={4} height={5} data-dim={(b.id * 7 + r * 3 + c) % 5 === 0 || undefined} />
            )))}
          </g>
        )
      })}
      <rect className="skyline__ground" x={0} y={TALL} width={n * SLOT} height={6} />
    </svg>
  )
}

export default function SortSkyline() {
  const [alg, setAlg] = useState<SortId>('quick')
  const [pick, setPick] = useState<SortId>('bubble')
  const [race, setRace] = useState(false)
  const [size, setSize] = useState<Size>('32')
  const n = Number(size)
  // The first town is seeded, so the prerendered page and the browser agree.
  const [seed, setSeed] = useState(0)
  const input = useMemo(() => town(n, seed === 0 ? seeded(n * 97) : Math.random), [n, seed])
  // A sort never races itself: if both name the same one, the rival steps aside.
  const rival = pick === alg ? SORTS.find((s) => s.id !== alg)!.id : pick

  const single = useMemo(() => record(RUNS[alg](input)), [alg, input])
  const second = useMemo(() => (race ? record(RUNS[rival](input)) : []), [race, rival, input])
  const raced = useMemo(() => (race ? zip(single, second) : []), [race, single, second])
  const soloRun = useRun(single, { initialSpeed: 5 })
  const raceRun = useRun(raced, { initialSpeed: 6 })

  const info = SORTS.find((s) => s.id === alg)!
  const other = SORTS.find((s) => s.id === rival)!
  const lanes = [
    { key: 'a', s: info, frames: single },
    { key: 'b', s: other, frames: second },
  ] as const

  return (
    <div className="viz">
      <div className="viz__main">
        <div className="viz__bar">
          <Picker label="Sort" options={SORTS.map(({ id, name }) => ({ id, name }))} value={alg} onChange={setAlg} />
          <div className="viz__tools">
            <Picker label="Buildings" options={[...SIZES]} value={size} onChange={setSize} />
            <Action onClick={() => setSeed((x) => x + 1)}>Shuffle</Action>
            <Action onClick={() => setRace((r) => !r)} primary={race}>{race ? 'Racing' : 'Race'}</Action>
          </div>
        </div>
        {race && raceRun.frame ? (
          <div className="race">
            {lanes.map(({ key, s, frames }) => {
              const end = frames.length - 1
              const k = Math.min(raceRun.i, end)
              return (
                <div className="race__lane" key={key}>
                  <div className="race__head">
                    <span className="race__name">{s.name} sort</span>
                    <span className="race__state" data-done={raceRun.i >= end || undefined}>{raceRun.i >= end ? `Done in ${end} steps` : `Step ${raceRun.i}`}</span>
                  </div>
                  <div className="viz__stage"><Town state={frames[k].state} n={n} speed={raceRun.speed} label={`${s.name} sort, step ${k} of ${end}`} /></div>
                </div>
              )
            })}
            <div className="race__rival">
              <span className="viz__hint">Against</span>
              <Picker label="Race against" options={SORTS.filter((s) => s.id !== alg).map(({ id, name }) => ({ id, name }))} value={rival} onChange={setPick} />
            </div>
          </div>
        ) : (
          <div className="viz__stage">{soloRun.frame && <Town state={soloRun.frame.state} n={n} speed={soloRun.speed} label={`${info.name} sort, step ${soloRun.i} of ${single.length - 1}`} />}</div>
        )}
        {race ? <Controls run={raceRun} label={`${info.name} against ${other.name}`} /> : <Controls run={soloRun} label={`${info.name} sort`} />}
      </div>
      <div className="viz__side">
        {race ? (
          <div className="readout">
            <p className="readout__note">Both sorts get the same town and take one step at a time: a comparison, a swap or a write. Fewer steps, first home.</p>
            {lanes.map(({ key, s, frames }) => {
              const f = frames[Math.min(raceRun.i, frames.length - 1)]
              return f && (
                <div className="lap" key={key}>
                  <span className="lap__name">{s.name}</span>
                  <dl className="readout__counts">{Object.entries(f.counts).map(([c, v]) => <div key={c}><dt>{c}</dt><dd>{v}</dd></div>)}</dl>
                </div>
              )
            })}
          </div>
        ) : (
          <>
            <Code lines={info.code} active={soloRun.frame?.line ?? -1} label={`${info.name} sort`} />
            {soloRun.frame && <Readout note={soloRun.frame.note} counts={soloRun.frame.counts} />}
          </>
        )}
      </div>
    </div>
  )
}
