import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { profile } from '../data/profile'
import { useReducedMotion } from '../lib/hooks'
import { createNightInput } from '../lib/night'

const NightScene = lazy(() => import('./canvas/NightScene'))

const year = new Date().getFullYear()

// The page ends where the headline does: then sleep. As the footer scrolls in,
// the town's windows go dark one by one until only den's amber one is on.
export default function Footer() {
  const ref = useRef<HTMLElement>(null)
  const input = useRef(createNightInput())
  const [near, setNear] = useState(false)
  const [seen, setSeen] = useState(false)
  const [still, setStill] = useState(false)
  const reduced = useReducedMotion()
  const running = seen && !reduced && !still

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

  return (
    <footer className="footer" ref={ref} aria-labelledby="footer-title">
      <div className="night" aria-hidden="true">
        {near && (
          <Suspense fallback={null}>
            <NightScene running={running} input={input} onStill={() => setStill(true)} />
          </Suspense>
        )}
        <div className="night__grain" />
      </div>

      <div className="container footer__inner">
        <p className="footer__statement" id="footer-title" data-reveal="head">{profile.closing}</p>
        <a className="footer__email" href={`mailto:${profile.email}`}>{profile.email}</a>
      </div>

      <div className="container">
        <div className="footer__base">
          <ul className="footer__links">
            <li><a href={profile.links.github} target="_blank" rel="noreferrer">GitHub</a></li>
            <li><a href={profile.links.linkedin} target="_blank" rel="noreferrer">LinkedIn</a></li>
            <li><a href="#top">Back to the top</a></li>
          </ul>
          <p className="footer__legal">{profile.name}, {year}</p>
        </div>
      </div>
    </footer>
  )
}
