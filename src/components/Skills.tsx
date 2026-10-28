import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { dailyTools, skillGroups } from '../data/skills'
import { projectsUsing } from '../data/projects'
import { useMediaQuery, useReducedMotion } from '../lib/hooks'

const SkillRack = lazy(() => import('./canvas/SkillRack'))

type Props = { active: string; onPress: (name: string) => void }

function Readout({ active }: { active: string }) {
  const used = projectsUsing(active)
  return (
    <div className="readout" aria-live="polite">
      <p className="readout__name">{active}</p>
      <p className="readout__line">
        {used.length > 0 ? (
          <>
            Used in{' '}
            {used.map((p, i) => (
              <span key={p.id}>
                {i > 0 && (i === used.length - 1 ? ' and ' : ', ')}
                <a href={`#${p.id}`}>{p.name}</a>
              </span>
            ))}
            .
          </>
        ) : dailyTools.includes(active) ? (
          'Open every day, outside any one project.'
        ) : (
          'Not in a listed project yet.'
        )}
      </p>
    </div>
  )
}

export default function Skills({ active, onPress }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  const wide = useMediaQuery('(min-width: 40.01rem)')
  const reduced = useReducedMotion()

  // Load the rack only as the section comes near; it is never needed on phones.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setNear(true)
        io.disconnect()
      }
    }, { rootMargin: '400px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section className="skills" id="skills" aria-labelledby="skills-title">
      <div className="container skills__grid">
        <div className="skills__head">
          <h2 id="skills-title">The stack, one key each.</h2>
          <p className="lead">Press a key to see which project uses it.</p>
        </div>

        <div className="rack" ref={ref} aria-hidden="true">
          {near && wide && (
            <Suspense fallback={null}>
              <SkillRack active={active} reduced={reduced} onPress={onPress} />
            </Suspense>
          )}
        </div>

        <Readout active={active} />

        <div className="keys" role="group" aria-label="Skills">
          {skillGroups.map((g) => (
            <div className="keys__group" key={g.name}>
              <p className="keys__label" id={`keys-${g.name}`}>{g.name}</p>
              <ul className="keys__list" aria-labelledby={`keys-${g.name}`}>
                {g.skills.map((s) => (
                  <li key={s}>
                    <button className="key" type="button" aria-pressed={s === active} onClick={() => onPress(s)}>{s}</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
