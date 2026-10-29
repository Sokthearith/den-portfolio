import type { CSSProperties } from 'react'
import { about, profile } from '../data/profile'

const delay = (ms: number) => ({ '--d': ms }) as CSSProperties

// den's lit window, drawn large: the one amber room in the dark that the
// whole site is built around. Through the glass, the desk it is all written
// at (a monitor, a lamp, a mug), a curtain half drawn. The light comes on as
// the section arrives.
function Window() {
  return (
    <svg className="about__window" viewBox="0 0 240 280" role="img" aria-label="den's window at night: a desk with a monitor and a lamp behind lit glass, the curtain half drawn">
      <defs>
        <clipPath id="about-glass"><rect x="44" y="36" width="152" height="188" /></clipPath>
      </defs>
      <rect className="about__wall" width="240" height="280" />
      <rect className="about__frame" x="34" y="26" width="172" height="208" />
      <rect className="about__glass" x="44" y="36" width="152" height="188" />
      <g clipPath="url(#about-glass)" className="about__room">
        {/* the desk, the monitor on its stand, the lamp and a mug */}
        <rect x="44" y="176" width="152" height="6" />
        <rect x="44" y="182" width="152" height="42" className="about__under" />
        <rect x="92" y="122" width="62" height="40" />
        <rect x="119" y="162" width="8" height="10" />
        <rect x="108" y="171" width="30" height="5" />
        <path d="M172 176 v-4 h14 v4 z M178 172 l-12 -30 l14 -12" className="about__lamp" />
        <path d="M170 128 l18 -6 l4 10 l-18 6 z" />
        <rect x="157" y="164" width="11" height="12" />
        {/* the curtain, half drawn, its folds */}
        <path d="M44 36 h40 c-6 40 6 80 -2 120 c-4 22 4 44 2 68 h-40 z" className="about__curtain" />
        <path d="M58 40 c-3 50 3 110 -1 180 M70 40 c-3 60 3 120 -1 182" className="about__fold" />
      </g>
      <rect className="about__frame" x="117" y="36" width="6" height="188" />
      <rect className="about__frame" x="44" y="128" width="152" height="6" />
      <rect className="about__frame" x="22" y="234" width="196" height="14" />
    </svg>
  )
}

// The three numbers in the statement, said once each, large.
const figures = [
  { value: '2', label: 'years of code' },
  { value: '4–5', label: 'projects so far' },
  { value: '2028', label: 'class at CADT' },
]

// Who den is, in their words from profile.ts: a name set large beside the
// window, one paragraph, the three numbers, and what comes next.
export default function About() {
  const [next, also] = about.facts.slice(1)
  return (
    <section className="about" id="about" aria-labelledby="about-title">
      <div className="about__top">
        <div className="about__words">
          <h2 id="about-title" className="about__title" data-reveal="head">I’m {profile.name}, den for short.</h2>
          <p className="about__lead" data-reveal style={delay(140)}>
            A software engineering student at CADT with two years of code behind me. Two of those projects are the full apps above, each with its own API. Most of it gets written at night, between a film and a record.
          </p>
        </div>
        <div className="about__picture" data-reveal style={delay(80)}><Window /></div>
      </div>

      <dl className="about__figures">
        {figures.map((f, i) => (
          <div className="about__figure" key={f.label} data-reveal style={delay(100 + i * 90)}>
            <dt className="about__label">{f.label}</dt>
            <dd className="about__value">{f.value}</dd>
          </div>
        ))}
      </dl>

      <dl className="about__next">
        {[next, also].map((f, i) => (
          <div key={f.label} data-reveal style={delay(i * 90)}>
            <dt>{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
