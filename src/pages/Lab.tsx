import type { CSSProperties } from 'react'
import LabNight from '../components/lab/LabNight'
import LabRack from '../components/lab/LabRack'
import LabSums from '../components/lab/LabSums'
import LeanType from '../components/lab/LeanType'
import '../styles/lab.css'

type Experiment = { id: string; name: string; line: string; tools: string[]; how: string }

const experiments: Record<string, Experiment> = {
  night: { id: 'night', name: 'The night, by hand', line: 'Set the hour, call the rain, switch a window on.', tools: ['React Three Fiber', 'GLSL'], how: 'the same full-screen shader that draws the night at the top of the site' },
  type: { id: 'type', name: 'Type that leans in', line: 'Run the pointer along the line; the letters widen and thicken toward it.', tools: ['Variable fonts', 'Instrument Sans'], how: 'width and weight are two axes of one font file, set letter by letter' },
  rack: { id: 'rack', name: 'The rack, loose', line: 'Drag it round. Press a key.', tools: ['drei', 'OrbitControls'], how: 'the skills rack from the home page, taken off its stand' },
  sums: { id: 'sums', name: 'Night sums', line: 'Sixty seconds of mental maths. Every right answer switches on a light in the town.', tools: ['React', 'SVG'], how: 'the sums get harder every four answers, five in a row adds two seconds, and your best stays on this device' },
}

const and = (items: string[]) => items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}` : items[0]

function Head({ e }: { e: Experiment }) {
  return (
    <div className="bench__head">
      <h2 id={`${e.id}-title`} data-reveal="head">{e.name}</h2>
      <p className="bench__line" data-reveal style={{ '--d': 120 } as CSSProperties}>{e.line}</p>
      <p className="bench__tools" data-reveal style={{ '--d': 220 } as CSSProperties}>Built with {and(e.tools)}: {e.how}.</p>
    </div>
  )
}

// Small experiments taken out of this site so they can be played with.
export default function Lab() {
  const { night, type, rack, sums } = experiments
  return (
    <>
      <section className="labtop" aria-labelledby="lab-title">
        <div className="container labtop__grid">
          <h1 id="lab-title" data-reveal="head">The lab.</h1>
          <p className="labtop__lead" data-reveal style={{ '--d': 200 } as CSSProperties}>Pieces of this site, taken apart to play with.</p>
        </div>
      </section>

      <section className="bench" id={night.id} aria-labelledby={`${night.id}-title`}>
        <div className="container bench__grid">
          <Head e={night} />
          <LabNight />
        </div>
      </section>

      <section className="bench bench--wide" id={type.id} aria-labelledby={`${type.id}-title`}>
        <div className="container">
          <Head e={type} />
          <LeanType />
        </div>
      </section>

      <section className="bench bench--flip" id={rack.id} aria-labelledby={`${rack.id}-title`}>
        <div className="container bench__grid">
          <Head e={rack} />
          <LabRack />
        </div>
      </section>

      <section className="bench" id={sums.id} aria-labelledby={`${sums.id}-title`}>
        <div className="container bench__grid">
          <Head e={sums} />
          <LabSums />
        </div>
      </section>
    </>
  )
}
