import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { projectsUsing } from '../../data/projects'
import { defaultSkill, skillGroups } from '../../data/skills'
import { useMediaQuery, useReducedMotion } from '../../lib/hooks'
import { useTheme } from '../../lib/theme'

const LooseRack = lazy(() => import('../canvas/SkillRack').then((m) => ({ default: m.LooseRack })))

// The skills rack off its stand: drag it round, press a key. The buttons
// below press the same keys for keyboards and phones.
export default function LabRack() {
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  const [active, setActive] = useState(defaultSkill)
  const reduced = useReducedMotion()
  const theme = useTheme()
  const wide = useMediaQuery('(min-width: 40.01rem)')
  const used = projectsUsing(active)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect() } }, { rootMargin: '400px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div className="labrack">
      <div className="labrack__stage" ref={ref} aria-hidden="true">
        {near && wide && (
          <Suspense fallback={null}>
            <LooseRack active={active} reduced={reduced} theme={theme} onPress={setActive} />
          </Suspense>
        )}
      </div>
      <p className="labrack__readout" aria-live="polite">
        <strong>{active}</strong>{' '}
        {used.length ? `is in ${used.map((p) => p.name).join(' and ')}.` : 'is not in a listed project yet.'}
      </p>
      <ul className="keys__list labrack__keys" aria-label="Skills">
        {skillGroups.flatMap((g) => g.skills).map((s) => (
          <li key={s}><button className="key" type="button" aria-pressed={s === active} onClick={() => setActive(s)}>{s}</button></li>
        ))}
      </ul>
    </div>
  )
}
