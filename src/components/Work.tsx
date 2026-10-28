import type { CSSProperties } from 'react'
import { projects, type Part, type Project } from '../data/projects'

const lights = (part: Part, active: string) => Boolean(part.uses?.includes(active))

// How a reading moves through Agrix: the parts left to right on one rail,
// with the alert branching off the API.
function System({ system, active }: { system: NonNullable<Project['system']>; active: string }) {
  const { caption, parts, branch } = system
  return (
    <figure className="system" aria-label={`${caption}: ${parts.map((p) => p.name).join(', then ')}, with ${branch.name} off the ${parts[branch.from].name}`}>
      <figcaption className="panel__caption">{caption}</figcaption>
      <ol className="system__parts">
        {parts.map((p) => (
          <li className="part" data-lit={lights(p, active)} key={p.name}>
            <span className="part__name">{p.name}</span>
            <span className="part__detail">{p.detail}</span>
          </li>
        ))}
      </ol>
      <div className="part system__branch" data-lit={lights(branch, active)} style={{ '--from': branch.from } as CSSProperties}>
        <span className="part__name">{branch.name}</span>
        <span className="part__detail">{branch.detail}</span>
      </div>
    </figure>
  )
}

function Flow({ flow, active }: { flow: NonNullable<Project['flow']>; active: string }) {
  return (
    <figure className="flow">
      <figcaption className="panel__caption">{flow.caption}</figcaption>
      <ol className="flow__steps">
        {flow.steps.map((s) => (
          <li className="part step" data-lit={lights(s, active)} key={s.name}>
            <span className="part__name">{s.name}</span>
            <span className="part__detail">{s.detail}</span>
          </li>
        ))}
      </ol>
    </figure>
  )
}

function ProjectCase({ project, active, flip }: { project: Project; active: string; flip: boolean }) {
  const lit = project.uses.includes(active)
  return (
    <article className={`project${flip ? ' project--flip' : ''}`} id={project.id} data-lit={lit} aria-labelledby={`${project.id}-name`}>
      {project.images && project.images.length > 0 && (
        <div className="project__shots">
          {project.images.map((img, i) => (
            <figure className="project__shot" data-slot={`${project.id}-${i + 1}`} data-kind="product" key={img.src}>
              <img src={img.src} alt={img.alt} loading="lazy" width="2880" height="1800" />
            </figure>
          ))}
        </div>
      )}

      <div className="project__body">
        <div className="project__intro">
          <h3 className="project__name" id={`${project.id}-name`}>{project.name}</h3>
          <p className="project__line">{project.line}</p>
          <a className="project__link" href={project.github} target="_blank" rel="noreferrer">Code on GitHub</a>
        </div>

        <div className="panel project__panel">
          {project.system && <System system={project.system} active={active} />}
          {project.flow && <Flow flow={project.flow} active={active} />}
          <dl className="project__stack">
            {project.stack.map((row) => (
              <div className="project__row" key={row.label}>
                <dt>{row.label}</dt>
                <dd>
                  <ul className="chips">
                    {row.items.map((item) => (
                      <li className="chip" data-lit={item === active} key={item}>{item}</li>
                    ))}
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

export default function Work({ active }: { active: string }) {
  return (
    <section className="work" id="work" aria-labelledby="work-title">
      <div className="container">
        <div className="work__head">
          <h2 id="work-title">Two full-stack apps.</h2>
          <p className="lead">A farm dashboard and a study planner, each with its own API.</p>
        </div>
        {projects.map((p, i) => (
          <ProjectCase project={p} active={active} flip={i % 2 === 1} key={p.id} />
        ))}
      </div>
    </section>
  )
}
