import { lazy, Suspense, useEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from 'react'
import { useReducedMotion } from '../lib/hooks'
import { createNightInput, lightWindow } from '../lib/night'
import { useSound } from '../lib/sound'
import Listen from './Listen'

const NightScene = lazy(() => import('./canvas/NightScene'))

type Props = {
  // The word set at full size along the bottom, and what the heading says to
  // a screen reader ("den" reads as "den, full-stack developer").
  name: string
  title: string
  sentence: string
  actions?: ReactNode
  // 0 is the town awake; 1 is asleep with only den's window on.
  lightsOut?: number
}

// The dark room's first screen: the night in a tall frame on the left, one
// sentence on the right, and the name crossing from the night into the room
// along the bottom. A click on the night turns on a window.
export default function Hero({ name, title, sentence, actions, lightsOut = 0 }: Props) {
  const ref = useRef<HTMLElement>(null)
  const input = useRef({ ...createNightInput(), lightsOut })
  const [mounted, setMounted] = useState(false)
  const [seen, setSeen] = useState(true)
  const [held, setHeld] = useState(false)
  const [still, setStill] = useState(false)
  const reduced = useReducedMotion()
  const running = mounted && seen && !held && !reduced && !still
  const sound = useSound()

  // What you hear, you see: the rain fader brings rain into the night.
  useEffect(() => {
    input.current.rain = sound.playing ? sound.levels.rain : 0
    input.current.invalidate?.()
  }, [sound])

  useEffect(() => {
    setMounted(true)
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Leaving the first screen: the ribbons dim with the scroll, and where the
  // stage does not hold (phones) the name settles a few percent smaller.
  // Reduced motion keeps it as it is.
  useEffect(() => {
    const el = ref.current
    if (!el || reduced) return
    let frame = 0
    const update = () => {
      frame = 0
      const p = Math.min(1, Math.max(0, window.scrollY / (el.offsetHeight * 0.85)))
      el.style.setProperty('--exit', p.toFixed(3))
      input.current.exit = p
      if (!running) input.current.invalidate?.()
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
      el.style.removeProperty('--exit')
    }
  }, [reduced, running])

  // Leaving the first screen on a wide screen: the stage holds for one screen
  // while the framed night opens out to the whole screen, the sentence lifts
  // away and the name grows and goes dark, so the night becomes the page's
  // sky. Phones, reduced motion and no script keep the still composition.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let alive = true
    let revert = () => {}
    Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (!alive) return
      gsap.registerPlugin(ScrollTrigger)
      const mm = gsap.matchMedia()
      mm.add('(min-width: 40.01rem) and (prefers-reduced-motion: no-preference)', () => {
        el.classList.add('is-live')
        const q = gsap.utils.selector(el)
        gsap.timeline({ scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true } })
          .fromTo(el, { '--open': 0 }, { '--open': 1, ease: 'power2.inOut', duration: 0.7 }, 0)
          .to(q('.hero__words, .hero__controls, .hero__hint'), { autoAlpha: 0, y: -40, ease: 'power1.in', duration: 0.3 }, 0)
          .to(q('.hero__name-in'), { scale: 1.18, ease: 'power2.inOut', duration: 0.7 }, 0)
          .to(q('.hero__name-in'), { autoAlpha: 0, ease: 'power1.in', duration: 0.25 }, 0.72)
        ScrollTrigger.refresh()
        return () => el.classList.remove('is-live')
      })
      mm.add('(max-width: 40rem), (prefers-reduced-motion: reduce)', () => {
        el.classList.add('is-rest')
        return () => el.classList.remove('is-rest')
      })
      revert = () => mm.revert()
    })
    return () => { alive = false; revert() }
  }, [])

  // The palette's "turn on a light" lands here, somewhere along the horizon.
  useEffect(() => {
    const on = () => lightWindow(input.current, 0.08 + Math.random() * 0.84, !running)
    window.addEventListener('night:light', on)
    return () => window.removeEventListener('night:light', on)
  }, [running])

  const track = (e: PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    input.current.x = e.clientX - r.left
    input.current.y = e.clientY - r.top
    input.current.inside = true
  }

  // A click or tap on the sky turns on a window below it; the controls keep
  // their own jobs.
  const light = (e: MouseEvent<HTMLElement>) => {
    if ((e.target as Element).closest('a, button, input, label, .listen')) return
    const r = e.currentTarget.getBoundingClientRect()
    lightWindow(input.current, (e.clientX - r.left) / r.width, !running)
  }

  return (
    <section className="hero scene" data-scene="night-opens" id="top" ref={ref} aria-labelledby="hero-title">
      <div className="hero__stage">
        <div
          className="hero__frame"
          onPointerMove={track}
          onPointerLeave={() => { input.current.inside = false }}
          onPointerUp={(e) => { if (e.pointerType !== 'mouse') input.current.inside = false }}
          onPointerCancel={() => { input.current.inside = false }}
          onClick={light}
        >
          <div className="night" aria-hidden="true">
            {mounted && (
              <Suspense fallback={null}>
                <NightScene running={running} input={input} amber={0.3} onStill={() => setStill(true)} />
              </Suspense>
            )}
            <div className="night__grain" />
          </div>
          <div className="hero__controls">
            {mounted && <Listen />}
            {!still && (
              <button className="btn btn--small hero__pause" type="button" onClick={() => setHeld((h) => !h)}>
                {held ? 'Play the night' : 'Pause the night'}
              </button>
            )}
          </div>
          {!still && (
            <p className="hero__hint" aria-hidden="true">
              <span className="hint--fine">Click</span><span className="hint--coarse">Tap</span> the sky to turn on a light.
            </p>
          )}
        </div>

        <div className="hero__words">
          <p className="hero__sentence">{sentence}</p>
          {actions && <div className="hero__actions">{actions}</div>}
        </div>

        <h1 id="hero-title" className="hero__name">
          <span className="visually-hidden">{title}</span>
          <span className="hero__name-in" aria-hidden="true">{name}</span>
        </h1>
      </div>
    </section>
  )
}
