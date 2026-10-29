import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { useMediaQuery } from '../../lib/hooks'

// Night sums: sixty seconds of mental arithmetic. Every right answer switches
// on one window in a sleeping town, and the sums get harder as it fills, so
// at the end the lit town is the score. Five right in a row buys two more
// seconds; a miss starts the run again. The best stays on this device.
const SECONDS = 60
const RUN = 5
const BONUS = 2
const BEST = 'lab:sums:best'

type Sum = { text: string; answer: number }
type Phase = 'ready' | 'on' | 'done'

const int = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))

// Every four right answers is a level: adding and taking away first, then
// times, then sharing, with the numbers growing as it goes.
function nextSum(score: number, last?: string): Sum {
  const n = Math.min(Math.floor(score / 4), 7)
  const ops = n < 1 ? '+-' : n < 2 ? '+-×' : '+-×÷'
  for (;;) {
    const op = ops[int(0, ops.length - 1)]
    let sum: Sum
    if (op === '+') { const a = int(2, 12 + n * 9), b = int(2, 12 + n * 9); sum = { text: `${a} + ${b}`, answer: a + b } }
    else if (op === '-') { const b = int(2, 12 + n * 9), c = int(1, 12 + n * 9); sum = { text: `${b + c} − ${b}`, answer: c } }
    else if (op === '×') { const a = int(2, 6 + n), b = int(2, 9 + n * 2); sum = { text: `${a} × ${b}`, answer: a * b } }
    else { const b = int(2, 6 + n), c = int(2, 9 + n * 2); sum = { text: `${b * c} ÷ ${b}`, answer: c } }
    if (sum.text !== last) return sum
  }
}

// The town is the same on every visit (and in the prerendered page): a
// seeded row of blocks, each with its grid of windows.
function town() {
  let s = 2207
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  const blocks: { x: number; w: number; h: number }[] = []
  const windows: { x: number; y: number }[] = []
  for (let x = 0; x < 640;) {
    const w = 38 + Math.floor(r() * 34), h = 70 + Math.floor(r() * 130)
    blocks.push({ x, w, h })
    const cols = Math.floor((w - 10) / 14), rows = Math.floor((h - 22) / 18)
    const left = x + (w - cols * 14 + 6) / 2
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < cols; col++) windows.push({ x: left + col * 14, y: 220 - h + 14 + row * 18 })
    x += w + 4 + Math.floor(r() * 10)
  }
  return { blocks, windows }
}
const { blocks, windows } = town()

const shuffled = (n: number) => {
  const a = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) { const j = int(0, i); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'go'] as const

export default function LabSums() {
  const [phase, setPhase] = useState<Phase>('ready')
  const [sum, setSum] = useState<Sum>({ text: '7 + 5', answer: 12 })
  const [typed, setTyped] = useState('')
  const [score, setScore] = useState(0)
  const [misses, setMisses] = useState(0)
  const [left, setLeft] = useState(SECONDS)
  const [best, setBest] = useState(0)
  const [order, setOrder] = useState<number[]>([])
  const [run, setRun] = useState(0)
  const [bonus, setBonus] = useState(0) // counts the bonuses, to replay the "+2 s"

  const input = useRef<HTMLInputElement>(null)
  const ends = useRef(0)
  const scored = useRef(0) // the score as the clock sees it when time runs out
  // On a touch screen the pad below is the keyboard, so the phone's own
  // keyboard never comes up over the town.
  const touch = useMediaQuery('(pointer: coarse)')

  useEffect(() => {
    try { setBest(Number(localStorage.getItem(BEST)) || 0) } catch { /* private mode: no best kept */ }
  }, [])

  const start = () => {
    setOrder(shuffled(windows.length))
    setScore(0)
    scored.current = 0
    setMisses(0)
    setRun(0)
    setBonus(0)
    setTyped('')
    setSum(nextSum(0))
    setLeft(SECONDS)
    ends.current = performance.now() + SECONDS * 1000
    setPhase('on')
  }

  useEffect(() => { if (phase === 'on') input.current?.focus({ preventScroll: true }) }, [phase])

  // The clock: measured against the end time, so a slow frame never adds time.
  useEffect(() => {
    if (phase !== 'on') return
    const id = setInterval(() => {
      const s = Math.max(0, (ends.current - performance.now()) / 1000)
      setLeft(s)
      if (s > 0) return
      setPhase('done')
      const final = scored.current
      setBest((b) => {
        if (final <= b) return b
        try { localStorage.setItem(BEST, String(final)) } catch { /* private mode */ }
        return final
      })
    }, 100)
    return () => clearInterval(id)
  }, [phase])

  // A right answer goes through as soon as it is typed; Enter checks a wrong one.
  const type = useCallback((value: string) => {
    if (phase !== 'on') return
    const v = value.replace(/\D/g, '').slice(0, 4)
    if (v && Number(v) === sum.answer) {
      const next = score + 1
      setScore(next)
      scored.current = next
      const inRow = run + 1
      setRun(inRow)
      if (inRow % RUN === 0) { ends.current += BONUS * 1000; setBonus((b) => b + 1) }
      setSum(nextSum(next, sum.text))
      setTyped('')
    } else setTyped(v)
  }, [phase, sum, score, run])

  const check = (e?: FormEvent) => {
    e?.preventDefault()
    if (phase !== 'on' || !typed) return
    setMisses((m) => m + 1)
    setRun(0)
    setTyped('')
    // A wrong answer shakes its head, unless motion is turned down.
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches)
      input.current?.animate([{ translate: '0' }, { translate: '-6px' }, { translate: '5px' }, { translate: '-3px' }, { translate: '0' }], { duration: 260, easing: 'ease-out' })
  }

  const press = (k: (typeof KEYS)[number]) => {
    if (k === 'del') setTyped((t) => t.slice(0, -1))
    else if (k === 'go') check()
    else type(typed + k)
  }

  const lit = new Set(order.slice(0, score))
  const shown = phase === 'on' ? Math.ceil(left) : phase === 'done' ? 0 : SECONDS
  const clock = `${Math.floor(shown / 60)}:${String(shown % 60).padStart(2, '0')}`
  const level = Math.min(Math.floor(score / 4), 7) + 1

  return (
    <div className="sums" data-phase={phase}>
      <div className="sums__top">
        <span className="sums__clock">
          {clock}
          {phase === 'on' && bonus > 0 && <span className="sums__bonus" key={bonus} aria-live="polite">+{BONUS} s</span>}
        </span>
        <span className="sums__best">{best ? `Best ${best}` : 'No best yet'}</span>
      </div>
      <div className="sums__time" style={{ '--left': Math.min(1, left / SECONDS) } as CSSProperties} aria-hidden="true" />

      <div className="sums__board">
        {phase === 'on' && (
          <form className="sums__ask" onSubmit={check}>
            <label className="sums__sum" htmlFor="sums-answer" key={sum.text}>{sum.text} =</label>
            <input
              id="sums-answer" ref={input} className="sums__answer"
              value={typed} onChange={(e) => type(e.target.value)}
              inputMode={touch ? 'none' : 'numeric'} readOnly={touch} autoComplete="off" spellCheck={false} aria-describedby="sums-level"
            />
            <span className="sums__level" id="sums-level">Level {level}{run >= 2 ? ` · ${run} in a row` : ''}</span>
          </form>
        )}
        {phase === 'ready' && (
          <div className="sums__rest">
            <p>Sixty seconds. Each right answer lights a window; five in a row buys two more seconds.</p>
            <button className="btn btn--primary" type="button" onClick={start}>Start</button>
          </div>
        )}
        {phase === 'done' && (
          <div className="sums__rest" role="status">
            <p><strong>{score === 1 ? '1 light' : `${score} lights`} on.</strong> {misses ? `${misses} missed.` : 'None missed.'} {score > 0 && score >= best ? 'Your best yet.' : ''}</p>
            <button className="btn btn--primary" type="button" onClick={start}>Again</button>
          </div>
        )}
      </div>

      <svg className="sums__town" viewBox="0 0 640 224" role="img" aria-label={`A town at night with ${score} of its ${windows.length} windows lit`}>
        {blocks.map((b) => <rect className="sums__block" key={b.x} x={b.x} y={220 - b.h} width={b.w} height={b.h} />)}
        {windows.map((w, i) => <rect className="sums__win" key={i} x={w.x} y={w.y} width={8} height={10} data-lit={lit.has(i) || undefined} />)}
        <rect className="sums__ground" x={0} y={220} width={640} height={4} />
      </svg>

      {touch && phase === 'on' && (
        <div className="sums__pad">
          {KEYS.map((k) => (
            <button key={k} type="button" className="sums__key" data-key={k} onClick={() => press(k)} aria-label={k === 'del' ? 'Delete' : k === 'go' ? 'Check' : undefined}>
              {k === 'del' ? '⌫' : k === 'go' ? '✓' : k}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
