import { Pause, Play, SkipBack, SkipForward, StepBack, StepForward } from 'lucide-react'
import type { ReactNode } from 'react'
import { SPEEDS, type Counts, type Run } from '../../lib/algo'

// The parts every visualizer shares: the transport under the stage, the
// algorithm's code with its running line lit, the counters, and a row of
// choices. Each visualizer lays them out round its own stage.

export function Controls<S>({ run, label }: { run: Run<S>; label: string }) {
  const { frames, i, playing, done, speed, setSpeed, toggle, step, seek } = run
  const last = Math.max(0, frames.length - 1)
  return (
    <div className="playbar" role="group" aria-label={`${label}: playback`}>
      <div className="playbar__buttons">
        <button className="playbar__btn" type="button" onClick={() => seek(0)} disabled={i === 0} aria-label="Back to the start"><SkipBack size={18} strokeWidth={1.75} aria-hidden="true" /></button>
        <button className="playbar__btn" type="button" onClick={() => step(-1)} disabled={i === 0} aria-label="One step back"><StepBack size={18} strokeWidth={1.75} aria-hidden="true" /></button>
        <button className="playbar__btn playbar__btn--play" type="button" onClick={toggle} disabled={last < 1} aria-label={playing ? 'Pause' : done && last > 0 ? 'Play again' : 'Play'}>
          {playing ? <Pause size={20} strokeWidth={1.75} aria-hidden="true" /> : <Play size={20} strokeWidth={1.75} aria-hidden="true" />}
        </button>
        <button className="playbar__btn" type="button" onClick={() => step(1)} disabled={done} aria-label="One step forward"><StepForward size={18} strokeWidth={1.75} aria-hidden="true" /></button>
        <button className="playbar__btn" type="button" onClick={() => seek(last)} disabled={done} aria-label="To the end"><SkipForward size={18} strokeWidth={1.75} aria-hidden="true" /></button>
      </div>
      <label className="playbar__scrub">
        <span className="visually-hidden">Step</span>
        <input type="range" min={0} max={last} value={i} onChange={(e) => seek(Number(e.target.value))} />
        <span className="playbar__step" aria-hidden="true">{i} / {last}</span>
      </label>
      <label className="playbar__speed">
        <span className="playbar__speed-name">Speed</span>
        <input type="range" min={0} max={SPEEDS.length - 1} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-valuetext={`${SPEEDS[speed]} steps a second`} />
        <span className="playbar__speed-value" aria-hidden="true">{SPEEDS[speed]}/s</span>
      </label>
    </div>
  )
}

// The code, one line per entry; the running line is the one lit thing in it.
export function Code({ lines, active, label }: { lines: string[]; active: number; label: string }) {
  return (
    <pre className="code" aria-label={`${label}, in code`}>
      {lines.map((l, n) => (
        <span className="code__line" data-on={n === active || undefined} key={n}>{l || ' '}{'\n'}</span>
      ))}
    </pre>
  )
}

// What the algorithm is doing now, and what it has spent so far.
export function Readout({ note, counts }: { note: string; counts: Counts }) {
  return (
    <div className="readout">
      <p className="readout__note" aria-live="polite">{note}</p>
      <dl className="readout__counts">
        {Object.entries(counts).map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
    </div>
  )
}

// A row of mutually exclusive choices (which algorithm, which mode).
export function Picker<T extends string>({ label, options, value, onChange }: { label: string; options: { id: T; name: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="picker" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={o.id === value} className="picker__opt" onClick={() => onChange(o.id)}>{o.name}</button>
      ))}
    </div>
  )
}

// A small plain button for actions on the stage (shuffle, clear, insert).
export function Action({ children, onClick, disabled, primary }: { children: ReactNode; onClick: () => void; disabled?: boolean; primary?: boolean }) {
  return <button type="button" className={`act${primary ? ' act--primary' : ''}`} onClick={onClick} disabled={disabled}>{children}</button>
}
