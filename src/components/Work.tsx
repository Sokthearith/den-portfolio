import type { CSSProperties } from 'react'
import { projects, type Part, type Project } from '../data/projects'
import { skillGroups } from '../data/skills'

const keys = new Set(skillGroups.flatMap((g) => g.skills))
const lights = (part: Part, active: string) => Boolean(part.uses?.includes(active))
const order = (i: number) => ({ '--i': i }) as CSSProperties

type Press = { active: string; onPress: (name: string) => void }

// How a reading moves through Agrix: the parts left to right on one rail,
// with the alert branching off the API. On arrival the rail draws itself and
// one amber pulse runs its length.
function System({ system, active }: { system: NonNullable<Project['system']> } & Pick<Press, 'active'>) {
  const { caption, parts, branch } = system
  return (
    <figure className="system" data-reveal="system" aria-label={`${caption}: ${parts.map((p) => p.name).join(', then ')}, with ${branch.name} off the ${parts[branch.from].name}`}>
      <figcaption className="panel__caption">{caption}</figcaption>
      <div className="system__track">
        <ol className="system__parts">
          {parts.map((p, i) => (
            <li className="part" data-lit={lights(p, active)} style={order(i)} key={p.name}>
              <span className="part__rail" aria-hidden="true" />
              <span className="part__name">{p.name}</span>
              <span className="part__detail">{p.detail}</span>
            </li>
          ))}
        </ol>
        <span className="system__pulse" aria-hidden="true" />
      </div>
      <div className="part system__branch" data-lit={lights(branch, active)} style={{ '--from': branch.from, '--i': parts.length } as CSSProperties}>
        <span className="part__rail" aria-hidden="true" />
        <span className="part__name">{branch.name}</span>
        <span className="part__detail">{branch.detail}</span>
      </div>
    </figure>
  )
}

function Flow({ flow, active }: { flow: NonNullable<Project['flow']> } & Pick<Press, 'active'>) {
  return (
    <figure className="flow" data-reveal="flow">
      <figcaption className="panel__caption">{flow.caption}</figcaption>
      <ol className="flow__steps">
        {flow.steps.map((s, i) => (
          <li className="part step" data-lit={lights(s, active)} style={order(i)} key={s.name}>
            <span className="part__rail" aria-hidden="true" />
            <span className="part__name">{s.name}</span>
            <span className="part__detail">{s.detail}</span>
          </li>
        ))}
      </ol>
    </figure>
  )
}

// A chip naming a key on the rack presses that key; the rest are plain tags.
function Chip({ item, active, onPress }: { item: string } & Press) {
  if (!keys.has(item)) return <li className="chip" data-lit={item === active}>{item}</li>
  return (
    <li>
      <button className="chip chip--key" type="button" aria-pressed={item === active} data-lit={item === active} onClick={() => onPress(item)}>
        {item}
      </button>
    </li>
  )
}

function ProjectCase({ project, active, onPress, flip }: { project: Project; flip: boolean } & Press) {
  const lit = project.uses.includes(active)
  return (
    <article className={`project${flip ? ' project--flip' : ''}`} id={project.id} data-lit={lit} aria-labelledby={`${project.id}-name`}>
      {project.images && project.images.length > 0 && (
        <div className="project__shots" data-reveal>
          {project.images.map((img, i) => (
            <figure className="project__shot" data-slot={`${project.id}-${i + 1}`} data-kind="product" key={img.src}>
              <img src={img.src} alt={img.alt} loading="lazy" width="2880" height="1800" />
            </figure>
          ))}
        </div>
      )}

      <div className="project__body">
        <div className="project__intro" data-reveal>
          <h3 className="project__name" id={`${project.id}-name`}>{project.name}</h3>
          <p className="project__line">{project.line}</p>
          <a className="project__link" href={project.github} target="_blank" rel="noreferrer">Code on GitHub</a>
        </div>

        <div className="panel project__panel" data-reveal style={{ '--d': 120 } as CSSProperties}>
          {project.system && <System system={project.system} active={active} />}
          {project.flow && <Flow flow={project.flow} active={active} />}
          <dl className="project__stack">
            {project.stack.map((row) => (
              <div className="project__row" key={row.label}>
                <dt>{row.label}</dt>
                <dd>
                  <ul className="chips">
                    {row.items.map((item) => <Chip item={item} active={active} onPress={onPress} key={item} />)}
                  </ul>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </article>
  )
}

export default function Work({ active, onPress }: Press) {
  return (
    <section className="work" id="work" aria-labelledby="work-title">
      <div className="container">
        <div className="work__head">
          <h2 id="work-title" data-reveal="head">Two full-stack apps.</h2>
          <p className="lead" data-reveal style={{ '--d': 150 } as CSSProperties}>A farm dashboard and a study planner, each with its own API.</p>
        </div>
        {projects.map((p, i) => (
          <ProjectCase project={p} active={active} onPress={onPress} flip={i % 2 === 1} key={p.id} />
        ))}
      </div>
    </section>
  )
}
