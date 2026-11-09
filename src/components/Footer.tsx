import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { profile } from '../data/profile'
import { useReducedMotion } from '../lib/hooks'
import { useLights } from '../lib/lights'
import { createNightInput, MAX_LIT, nightClock } from '../lib/night'
import { LeaveLight, TownLights } from './Lights'

const NightScene = lazy(() => import('./canvas/NightScene'))

const year = new Date().getFullYear()

// The page ends where the headline does: then sleep. As the contact night scrolls in,
// the town's windows go dark one by one until only den's amber one is on,
// and the lights visitors left on.
export default function Footer() {
  const ref = useRef<HTMLElement>(null)
  const input = useRef(createNightInput())
  const [near, setNear] = useState(false)
  const [seen, setSeen] = useState(false)
  const [still, setStill] = useState(false)
  const reduced = useReducedMotion()
  const running = seen && !reduced && !still
  const { configured, lights, leave } = useLights(near)

  // Each visitor light keeps the moment it came on, so it never re-flares; a
  // light just left flares as it lands, when the night is moving to show it.
  const litAt = useRef(new Map<string, number>())
  const fresh = useRef<string | null>(null)
  useEffect(() => {
    const lit = input.current.lit
    lit.fill(-1)
    lights.slice(0, MAX_LIT).forEach((l, i) => {
      let at = litAt.current.get(l.id)
      if (at === undefined) {
        at = l.id === fresh.current && running ? nightClock() : nightClock() - 10
        litAt.current.set(l.id, at)
      }
      lit.set([l.x, l.row, at], i * 3)
    })
    input.current.invalidate?.()
  }, [lights, running])

  const onLeave = useCallback<typeof leave>(async (...args) => {
    const out = await leave(...args)
    if (out.light) fresh.current = out.light.id
    return out
  }, [leave])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const nearIo = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setNear(true)
        nearIo.disconnect()
      }
    }, { rootMargin: '600px 0px' })
    const seenIo = new IntersectionObserver(([e]) => setSeen(e.isIntersecting))
    nearIo.observe(el)
    seenIo.observe(el)
    return () => { nearIo.disconnect(); seenIo.disconnect() }
  }, [])

  // Scrubbed to the scroll; reduced motion shows the end: only den's light on.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reduced) {
      input.current.lightsOut = 1
      el.style.setProperty('--first-light', '1')
      input.current.invalidate?.()
      return
    }
    let frame = 0
    const update = () => {
      frame = 0
      const r = el.getBoundingClientRect()
      const p = (window.innerHeight - r.top) / r.height
      input.current.lightsOut = Math.min(1, Math.max(0, (p - 0.25) / 0.65))
      // As the last windows go out the sky behind them starts to pale.
      el.style.setProperty('--first-light', Math.min(1, Math.max(0, (p - 0.45) / 0.55)).toFixed(3))
      if (!running) input.current.invalidate?.()
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [reduced, running])

  // The close, in three parts. First a field of den's amber with the ways to
  // reach den set as poster lines. Then the town at night as the last
  // picture, its windows going out as it scrolls in, where a visitor can
  // leave a light on. Last, the name once more, margin to margin.
  return (
    <footer className="close">
      <section className="reach" id="contact" aria-labelledby="contact-title">
        <div className="reach__head">
          <h2 className="reach__title" id="contact-title" data-reveal="head">Write to me</h2>
          <p className="reach__ask" data-reveal>{profile.closing}</p>
        </div>
        <ul className="reach__rows">
          <li><a className="reach__row" href={`mailto:${profile.email}`}><span className="reach__text">{profile.email}</span><span className="reach__what">Email</span></a></li>
          <li><a className="reach__row" href={profile.links.github} target="_blank" rel="noreferrer"><span className="reach__text">GitHub / Sokthearith</span><span className="reach__what">Code</span></a></li>
          <li><a className="reach__row" href={profile.links.linkedin} target="_blank" rel="noreferrer"><span className="reach__text">LinkedIn</span><span className="reach__what">{profile.name}</span></a></li>
          <li className="reach__hello">
            <span className="reach__text" aria-hidden="true">Say hello</span>
            <a className="reach__go" href={`mailto:${profile.email}`} aria-label={`Email ${profile.email}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M12 5l7 7-7 7" /></svg>
            </a>
          </li>
        </ul>
      </section>

      <section className="contact" ref={ref} aria-labelledby="lights-title">
        <div className="night" aria-hidden="true">
          {near && (
            <Suspense fallback={null}>
              <NightScene running={running} input={input} onStill={() => setStill(true)} />
            </Suspense>
          )}
          <div className="night__grain" />
        </div>

        <TownLights lights={lights} />

        <div className="card">
          <h2 className="card__title" id="lights-title">Leave a light on</h2>
          <p className="card__ask">The town is going to sleep. A note from you keeps one window lit.</p>
          {configured && <LeaveLight onLeave={onLeave} />}
        </div>
      </section>

      <div className="close__line">
        <div className="close__cols">
          <p className="close__who">{profile.name}<br />{profile.role}, CADT</p>
          <ul className="close__links">
            <li><a href={profile.links.github} target="_blank" rel="noreferrer">GitHub</a></li>
            <li><a href={profile.links.linkedin} target="_blank" rel="noreferrer">LinkedIn</a></li>
            <li><a href={`mailto:${profile.email}`}>Email</a></li>
          </ul>
          <ul className="close__links">
            <li><a href="/algorithms">Algorithms</a></li>
            <li><a href="/lab">Lab</a></li>
            <li><a href="#top">Back to the top</a></li>
          </ul>
        </div>
        <svg className="close__word" viewBox="38 141 1327 859" role="img" aria-label={profile.wordmark}>
          <text x="0" y="1000">{profile.wordmark.toUpperCase()}</text>
        </svg>
        <p className="close__legal">{profile.name}, {year}</p>
      </div>
    </footer>
  )
}
