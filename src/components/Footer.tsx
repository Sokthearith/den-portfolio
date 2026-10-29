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
      input.current.invalidate?.()
      return
    }
    let frame = 0
    const update = () => {
      frame = 0
      const r = el.getBoundingClientRect()
      const p = (window.innerHeight - r.top) / r.height
      input.current.lightsOut = Math.min(1, Math.max(0, (p - 0.25) / 0.65))
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

  // The close: the town at night as the last picture, one lit card on it with
  // the ways to reach den and the guestbook, then a single quiet line.
  return (
    <footer className="close">
      <section className="contact" id="contact" ref={ref} aria-labelledby="contact-title">
        <div className="night" aria-hidden="true">
          {near && (
            <Suspense fallback={null}>
              <NightScene running={running} input={input} onStill={() => setStill(true)} />
            </Suspense>
          )}
          <div className="night__grain" />
        </div>

        <TownLights lights={lights} />

        <div className="card" data-reveal>
          <h2 className="card__title" id="contact-title">Write to me</h2>
          <p className="card__ask">{profile.closing}</p>
          <dl className="card__rows">
            <div><dt>Email</dt><dd><a href={`mailto:${profile.email}`}>{profile.email}</a></dd></div>
            <div><dt>GitHub</dt><dd><a href={profile.links.github} target="_blank" rel="noreferrer">Sokthearith</a></dd></div>
            <div><dt>LinkedIn</dt><dd><a href={profile.links.linkedin} target="_blank" rel="noreferrer">{profile.name}</a></dd></div>
          </dl>
          {configured && <LeaveLight onLeave={onLeave} />}
          <a className="btn btn--primary card__action" href={`mailto:${profile.email}`}>Email me</a>
        </div>
      </section>

      <div className="close__line">
        <p>{profile.wordmark}, {profile.role.toLowerCase()}</p>
        <ul className="close__links">
          <li><a href={profile.links.github} target="_blank" rel="noreferrer">GitHub</a></li>
          <li><a href={profile.links.linkedin} target="_blank" rel="noreferrer">LinkedIn</a></li>
          <li><a href="/lab">Lab</a></li>
          <li><a href="#top">Back to the top</a></li>
        </ul>
        <p className="close__legal">{profile.name}, {year}</p>
      </div>
    </footer>
  )
}
