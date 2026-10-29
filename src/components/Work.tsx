import type { CSSProperties } from 'react'
import { projects, type Part, type Project } from '../data/projects'
import { skillGroups } from '../data/skills'
import { AgrixScreenView, PlanifyScreenView } from './WorkScreens'
import '../styles/work.css'

const keys = new Set(skillGroups.flatMap((g) => g.skills))
const lights = (part: Part, active: string) => Boolean(part.uses?.includes(active))
const delay = (ms: number) => ({ '--d': ms }) as CSSProperties

type Press = { active: string; onPress: (name: string) => void }

// One part of how the app works: lit like a window when it runs on the
// pressed key.
function Row({ part, active, extra }: { part: Part; active: string; extra?: string }) {
  return (
    <li className="case__part" data-lit={lights(part, active)}>
      <span className="case__part-name">{part.name}</span>
      <span className="case__part-detail">{part.detail}{extra}</span>
    </li>
  )
}

// A stack item that names a key on the rack presses it; the rest are words.
function StackItem({ item, active, onPress }: { item: string } & Press) {
  if (!keys.has(item)) return <li className="case__item">{item}</li>
  return (
    <li>
      <button className="case__key" type="button" aria-pressed={item === active} onClick={() => onPress(item)}>
        {item}
      </button>
    </li>
  )
}

// A plate: the app's own screen fills the frame, and the same row crosses it
// at half height on every plate, so scrolling turns them like pages. What it
// does and how it is built slides up over it.
function Case({ project, active, onPress }: { project: Project } & Press) {
  const lit = project.uses.includes(active)
  const { system, flow, screen } = project
  return (
    <article className="case" id={project.id} data-lit={lit} aria-labelledby={`${project.id}-name`}>
      <div className="case__plate">
        <div className="case__screen" data-kind={screen?.kind}>
          {screen?.kind === 'agrix' && <AgrixScreenView screen={screen} />}
          {screen?.kind === 'planify' && <PlanifyScreenView screen={screen} />}
        </div>
        <div className="case__row">
          <h3 className="case__name" id={`${project.id}-name`}>{project.name}</h3>
          <p className="case__line">{project.line}</p>
          <a className="case__code" href={project.github} target="_blank" rel="noreferrer">Code on GitHub</a>
        </div>
      </div>

      <div className="case__more">
        {system && (
          <div className="case__how" data-reveal>
            <h4 className="case__caption">{system.caption}</h4>
            <ol className="case__parts">
              {system.parts.map((p) => <Row part={p} active={active} key={p.name} />)}
              <Row part={system.branch} active={active} extra={`, off the ${system.parts[system.branch.from].name}`} />
            </ol>
          </div>
        )}
        {flow && (
          <div className="case__how" data-reveal>
            <h4 className="case__caption">{flow.caption}</h4>
            <ol className="case__parts">
              {flow.steps.map((s) => <Row part={s} active={active} key={s.name} />)}
            </ol>
          </div>
        )}
        <dl className="case__stack" data-reveal style={delay(120)}>
          {project.stack.map((row) => (
            <div className="case__stack-row" key={row.label}>
              <dt>{row.label}</dt>
              <dd>
                <ul className="case__items">
                  {row.items.map((item) => <StackItem item={item} active={active} onPress={onPress} key={item} />)}
                </ul>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  )
}

export default function Work({ active, onPress }: Press) {
  return (
    <section className="cases" id="work" aria-labelledby="work-title">
      <div className="cases__intro">
        <h2 id="work-title" data-reveal="head">Two full-stack apps.</h2>
        <p data-reveal style={delay(150)}>A farm dashboard and a study planner, each with its own API.</p>
      </div>
      {projects.map((p) => <Case project={p} active={active} onPress={onPress} key={p.id} />)}
    </section>
  )
}
