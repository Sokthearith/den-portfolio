import type { CSSProperties } from 'react'
import { about } from '../data/profile'

export default function About() {
  return (
    <section className="about" id="about" aria-labelledby="about-title">
      <div className="container about__grid">
        <h2 className="about__statement" id="about-title" data-reveal="head">{about.statement}</h2>
        <dl className="about__facts">
          {about.facts.map((f, i) => (
            <div className="about__row" data-reveal="row" style={{ '--d': i * 120 } as CSSProperties} key={f.label}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
