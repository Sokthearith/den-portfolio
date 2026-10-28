import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { profile } from '../data/profile'
import { useReducedMotion } from '../lib/hooks'

const NightScene = lazy(() => import('./canvas/NightScene'))

export default function Hero() {
  const ref = useRef<HTMLElement>(null)
  const [mounted, setMounted] = useState(false)
  const [seen, setSeen] = useState(true)
  const [held, setHeld] = useState(false)
  const [still, setStill] = useState(false)
  const reduced = useReducedMotion()
  const running = mounted && seen && !held && !reduced && !still

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
            <NightScene running={running} onStill={() => setStill(true)} />
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
        {!still && (
          <button className="btn btn--small hero__pause" type="button" onClick={() => setHeld((h) => !h)}>
            {held ? 'Play the night' : 'Pause the night'}
          </button>
        )}
      </div>
    </section>
  )
}
