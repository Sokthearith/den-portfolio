import type { CSSProperties } from 'react'
import { profile } from '../data/profile'

// den's lit window, drawn: the one amber pane in the dark that the whole site
// is built around. It stands where a portrait would, as the paragraph's
// drop capital.
function Window() {
  return (
    <svg className="about__window" viewBox="0 0 36 36" role="img" aria-label="den's lit window">
      <rect width="36" height="36" fill="var(--surface)" />
      <rect x="7" y="7" width="22" height="22" fill="var(--accent)" />
      <rect x="17" y="7" width="2" height="22" fill="var(--surface)" />
      <rect x="7" y="17" width="22" height="2" fill="var(--surface)" />
    </svg>
  )
}

// One paragraph set large, opening on the window, with three facts beside it.
// Every sentence comes from profile.ts; nothing here is more than it says.
export default function About() {
  return (
    <section className="about" id="about" aria-labelledby="about-title">
      <div className="about__grid">
        <div className="about__side">
          <h2 id="about-title" className="about__title" data-reveal>About</h2>
          <dl className="about__facts" data-reveal style={{ '--d': 90 } as CSSProperties}>
            <div><dt>Studying</dt><dd>Software engineering at CADT</dd></div>
            <div><dt>Finishing</dt><dd>Class of 2028</dd></div>
            <div><dt>Projects</dt><dd>Four to five so far</dd></div>
          </dl>
        </div>
        <div className="about__text">
          <p className="about__lead" data-reveal style={{ '--d': 150 } as CSSProperties}>
            <Window />
            <strong>I’m {profile.name}, den for short:</strong> a software engineering student at CADT, class of 2028, with two years of code behind me.
          </p>
          <p className="about__more" data-reveal style={{ '--d': 220 } as CSSProperties}>
            Two of them are the full apps above, each with its own API. Next I’m learning AI engineering and cybersecurity, with Flutter, game development and project management also on the list. Most of it gets written at night, between a film and a record.
          </p>
        </div>
      </div>
    </section>
  )
}
