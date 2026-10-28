import { Fragment, lazy, Suspense, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from 'react'
import { profile } from '../data/profile'
import { useReducedMotion } from '../lib/hooks'
import { createNightInput, lightWindow } from '../lib/night'

const NightScene = lazy(() => import('./canvas/NightScene'))

export default function Hero() {
  const ref = useRef<HTMLElement>(null)
  const input = useRef(createNightInput())
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

  // Leaving the hero: the words lift away and the ribbons dim, scrubbed to the
  // scroll, at most once a frame. Reduced motion keeps the hero as it is.
  useEffect(() => {
    const el = ref.current
    if (!el || reduced) return
    let frame = 0
    const update = () => {
      frame = 0
      const p = Math.min(1, Math.max(0, window.scrollY / (el.offsetHeight * 0.85)))
      el.style.setProperty('--exit', p.toFixed(3))
      input.current.exit = p
      input.current.invalidate?.()
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
      el.style.removeProperty('--exit')
    }
  }, [reduced])

  const track = (e: PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    input.current.x = e.clientX - r.left
    input.current.y = e.clientY - r.top
    input.current.inside = true
  }

  // A click or tap on the sky turns on a window below it; links and buttons
  // keep their own jobs.
  const light = (e: MouseEvent<HTMLElement>) => {
    if ((e.target as Element).closest('a, button')) return
    const r = e.currentTarget.getBoundingClientRect()
    lightWindow(input.current, (e.clientX - r.left) / r.width, !running)
  }

  const words = profile.headline.split(' ')

  return (
    <section
      className="hero"
      id="top"
      ref={ref}
      aria-labelledby="hero-title"
      onPointerMove={track}
      onPointerLeave={() => { input.current.inside = false }}
      onClick={light}
    >
      <div className="night" aria-hidden="true">
        {mounted && (
          <Suspense fallback={null}>
            <NightScene running={running} input={input} onStill={() => setStill(true)} />
          </Suspense>
        )}
        <div className="night__grain" />
      </div>

      <div className="hero__inner container">
        <h1 id="hero-title" className="hero__title">
          {words.map((w, i) => (
            <Fragment key={i}>
              <span className="word"><span className="word__in" style={{ '--i': i } as CSSProperties}>{w}</span></span>
              {i < words.length - 1 && ' '}
            </Fragment>
          ))}
        </h1>
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
        {!still && (
          <p className="hero__hint" aria-hidden="true">
            <span className="hint--fine">Click</span><span className="hint--coarse">Tap</span> the sky to turn on a light.
          </p>
        )}
      </div>
    </section>
  )
}
