import LabNight from '../components/lab/LabNight'
import LabRack from '../components/lab/LabRack'
import LeanType from '../components/lab/LeanType'

type Experiment = { id: string; name: string; line: string; tools: string[] }

const experiments: Record<string, Experiment> = {
  night: { id: 'night', name: 'The night, by hand', line: 'Set the hour, call the rain, switch a window on.', tools: ['React Three Fiber', 'GLSL'] },
  type: { id: 'type', name: 'Type that leans in', line: 'Run the pointer along the line; the letters widen and thicken toward it.', tools: ['Variable fonts', 'Instrument Sans'] },
  rack: { id: 'rack', name: 'The rack, loose', line: 'Drag it round. Press a key.', tools: ['drei', 'OrbitControls'] },
}

function Head({ e }: { e: Experiment }) {
  return (
    <div className="exp__head">
      <h2 id={`${e.id}-title`} data-reveal="head">{e.name}</h2>
      <p className="lead">{e.line}</p>
      <ul className="chips exp__tools" aria-label="Built with">
        {e.tools.map((t) => <li className="chip" key={t}>{t}</li>)}
      </ul>
    </div>
  )
}

// Small experiments taken out of this site so they can be played with.
export default function Lab() {
  const { night, type, rack } = experiments
  return (
    <>
      <section className="labhead" aria-labelledby="lab-title">
        <div className="container">
          <h1 id="lab-title" data-reveal="head">The lab.</h1>
          <p className="lead">Pieces of this site, taken apart to play with.</p>
        </div>
      </section>

      <section className="exp" id={night.id} aria-labelledby={`${night.id}-title`}>
        <div className="container">
          <div className="horizon" aria-hidden="true" />
          <div className="exp__grid">
            <Head e={night} />
            <LabNight />
          </div>
        </div>
      </section>

      <section className="exp exp--wide" id={type.id} aria-labelledby={`${type.id}-title`}>
        <div className="container">
          <div className="horizon" aria-hidden="true" />
          <Head e={type} />
          <LeanType />
        </div>
      </section>

      <section className="exp exp--flip" id={rack.id} aria-labelledby={`${rack.id}-title`}>
        <div className="container">
          <div className="horizon" aria-hidden="true" />
          <div className="exp__grid">
            <Head e={rack} />
            <LabRack />
          </div>
        </div>
      </section>
    </>
  )
}
