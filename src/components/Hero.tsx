import { lazy, Suspense, useEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from 'react'
import { useReducedMotion } from '../lib/hooks'
import { createNightInput, lightWindow } from '../lib/night'
import { useSound } from '../lib/sound'
import Listen from './Listen'

const NightScene = lazy(() => import('./canvas/NightScene'))

// Each word the hero can set, measured in Anton at 1000 units: the box its
// ink fills (so the letters run exactly margin to margin), and for the home
// page's scene, a point well inside a letter's ink (the middle arm of the E)
// that the camera falls into.
const WORDS: Record<string, { box: string; into?: string }> = {
  den: { box: '38 141 1327 859', into: '49.9% 49.9%' },
  dark: { box: '38 141 1898 859' },
}

type Props = {
  // The word set as the monument, and what the heading says to a screen
  // reader ("den" reads as "den, full-stack developer").
  name: string
  title: string
  sentence: string
  actions?: ReactNode
  // 0 is the town awake; 1 is asleep with only den's window on.
  lightsOut?: number
}

// The first screen: the name as a monument, margin to margin, and the night
// lives inside its letters. The page's ground is a sheet over the town with
// the word cut out of it, so the ribbons, the rain and the windows show only
// through D, E and N. A click on a letter turns on a window. On a wide screen
// with motion the camera then falls into the E until the night is the whole
// screen and becomes the page's sky.
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
  const word = WORDS[name] ?? WORDS.den
  const maskId = `hero-cut-${name}`

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

  // Leaving the first screen, the ribbons dim with the scroll. Reduced
  // motion keeps them as they are.
  useEffect(() => {
    const el = ref.current
    if (!el || reduced) return
    let frame = 0
    const update = () => {
      frame = 0
      const p = Math.min(1, Math.max(0, window.scrollY / (el.offsetHeight * 0.85)))
      input.current.exit = p
      if (!running) input.current.invalidate?.()
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [reduced, running])

  // Into the letters, on a wide screen with motion: the stage holds for a
  // screen while the words lift away and the sheet with the word cut out of
  // it grows about a point inside the E, until the letter's opening is the
  // whole screen and the night is the page's sky. Phones, reduced motion, no
  // script and words without an entry point keep the still composition.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    // A word with no way in (the 404's) always rests.
    if (!word.into) { el.classList.add('is-rest'); return () => el.classList.remove('is-rest') }
    let alive = true
    let revert = () => {}
    Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (!alive) return
      gsap.registerPlugin(ScrollTrigger)
      const mm = gsap.matchMedia()
      mm.add('(min-width: 64.01rem) and (min-height: 34rem) and (prefers-reduced-motion: no-preference)', () => {
        el.classList.add('is-live')
        const q = gsap.utils.selector(el)
        gsap.timeline({ scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: 0.3, invalidateOnRefresh: true } })
          .to(q('.hero__words, .hero__tools'), { autoAlpha: 0, y: -48, ease: 'power1.in', duration: 0.25 }, 0)
          .fromTo(q('.hero__cut'), { scale: 1 }, { scale: 18, ease: 'power3.in', duration: 0.8 }, 0.05)
          .to({}, { duration: 0.15 })
        ScrollTrigger.refresh()
        return () => el.classList.remove('is-live')
      })
      mm.add('(max-width: 64rem), (max-height: 33.99rem), (prefers-reduced-motion: reduce)', () => {
        el.classList.add('is-rest')
        return () => el.classList.remove('is-rest')
      })
      revert = () => mm.revert()
    })
    return () => { alive = false; revert() }
  }, [word.into])

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

  // A click or tap on a letter turns on a window below it; the controls keep
  // their own jobs.
  const light = (e: MouseEvent<HTMLElement>) => {
    if ((e.target as Element).closest('a, button, input, label, .listen')) return
    const r = e.currentTarget.getBoundingClientRect()
    lightWindow(input.current, (e.clientX - r.left) / r.width, !running)
  }

  return (
    <section className="hero scene" data-scene="into-the-letters" id="top" ref={ref} aria-labelledby="hero-title">
      <div
        className="hero__stage"
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

        {/* The title is the word itself: the room's ground, with the word cut
            out of it. The sheet runs far past the word's own box, so it still
            covers the screen as the scene grows it. */}
        <h1 id="hero-title" className="hero__name">
        <span className="visually-hidden">{title}</span>
        <svg className="hero__cut" viewBox={word.box} aria-hidden="true" focusable="false">
          <defs>
            <mask id={maskId} maskUnits="userSpaceOnUse" x="-40000" y="-40000" width="80000" height="80000">
              <rect x="-40000" y="-40000" width="80000" height="80000" fill="#fff" />
              <text x="0" y="1000" className="hero__letters" fill="#000">{name.toUpperCase()}</text>
            </mask>
          </defs>
          <rect x="-40000" y="-40000" width="80000" height="80000" mask={`url(#${maskId})`} />
        </svg>
        </h1>

        <div className="hero__words">
          <p className="hero__sentence">{sentence}</p>
          {actions && <div className="hero__actions">{actions}</div>}
        </div>

        <div className="hero__tools">
          {!still && (
            <p className="hero__hint" aria-hidden="true">
              <span className="hint--fine">Click</span><span className="hint--coarse">Tap</span> a letter to turn on a light.
            </p>
          )}
          <div className="hero__controls">
            {mounted && <Listen />}
            {!still && (
              <button className="btn btn--small hero__pause" type="button" onClick={() => setHeld((h) => !h)}>
                {held ? 'Play the night' : 'Pause the night'}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
