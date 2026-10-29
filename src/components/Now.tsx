import { useEffect, useRef, useState } from 'react'
import { now as learning } from '../data/profile'
import { useNow } from '../lib/now'
import Projector from './Projector'
import Turntable from './Turntable'
import '../styles/now.css'

// Right now, as one evening: den's own short and then the films from
// Letterboxd run through a projector, the record from Spotify turns on the
// deck, and under them what den is learning. Each part shows only what is real; the films are in the
// page before any script runs, and the deck appears once Spotify answers.
export default function Now() {
  const ref = useRef<HTMLElement>(null)
  const [near, setNear] = useState(false)
  const { films, listening } = useNow(near)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect() } }, { rootMargin: '600px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const radio = listening?.configured && listening.track ? listening : null

  return (
    <section className="nowroom" id="now" ref={ref} aria-labelledby="now-title">
      <div className="nowroom__head">
        <h2 id="now-title" data-reveal="head">Right now.</h2>
        <p data-reveal>What I’m watching, playing and learning, as it happens.</p>
      </div>

      <Projector films={films.slice(0, 6)} />
      {radio && <Turntable listening={radio} />}

      <div className="nowroom__learn">
        <h3>Learning</h3>
        <div>
          <p className="nowroom__subject">{learning.subject}</p>
          <p>{learning.with}</p>
        </div>
      </div>
    </section>
  )
}
