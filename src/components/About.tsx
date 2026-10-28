import { Fragment, type CSSProperties } from 'react'
import { about } from '../data/profile'

export default function About() {
  return (
    <section className="about" id="about" aria-labelledby="about-title">
      <div className="container">
        <div className="horizon" aria-hidden="true" />
      </div>
      <div className="container about__grid">
        <h2 className="about__statement" id="about-title">
          {about.statement.split(' ').map((w, i, all) => (
            <Fragment key={i}>
              <span className="sw" style={{ '--i': i } as CSSProperties}>{w}</span>
              {i < all.length - 1 && ' '}
            </Fragment>
          ))}
        </h2>
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
