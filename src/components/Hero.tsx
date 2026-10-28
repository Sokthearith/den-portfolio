import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { profile } from '../data/profile'

const NightScene = lazy(() => import('./canvas/NightScene'))

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

export default function Hero() {
  const ref = useRef<HTMLElement>(null)
  const [mounted, setMounted] = useState(false)
  const [seen, setSeen] = useState(true)
  const [held, setHeld] = useState(false)
  const reduced = useReducedMotion()
  const running = mounted && seen && !held && !reduced

  useEffect(() => {
    setMounted(true)
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section className="hero" id="top" ref={ref} aria-labelledby="hero-title">
      <div className="night" aria-hidden="true">
        {mounted && (
          <Suspense fallback={null}>
            <NightScene running={running} />
          </Suspense>
        )}
        <div className="night__grain" />
      </div>

      <div className="hero__inner container">
        <h1 id="hero-title" className="hero__title">{profile.headline}</h1>
        <p className="lead hero__lede">{profile.lede}</p>
        <div className="hero__actions">
          <a className="btn btn--primary" href={`mailto:${profile.email}`}>Email me</a>
          <a className="btn" href="#work">See my work</a>
        </div>
      </div>

      <div className="hero__foot container">
        <button className="btn btn--small hero__pause" type="button" aria-pressed={held} onClick={() => setHeld((h) => !h)}>
          {held ? 'Play the night' : 'Pause the night'}
        </button>
      </div>
    </section>
  )
}
