import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { now as learning } from '../data/profile'
import { useNow, type Film } from '../lib/now'
import Receiver from './Receiver'

const LETTERBOXD = 'https://letterboxd.com/den4u/'

const stars = (r: number) => '★'.repeat(Math.floor(r)) + (r % 1 ? '½' : '')
const day = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

function Poster({ film, i }: { film: Film; i: number }) {
  return (
    <li className="film" data-reveal style={{ '--d': i * 90 } as CSSProperties}>
      <a className="film__link" href={film.url} target="_blank" rel="noreferrer">
        <span className="film__poster">
          {film.poster && <img src={film.poster} alt="" width={600} height={900} loading="lazy" decoding="async" />}
        </span>
        <span className="film__title">{film.title}</span>
      </a>
      <span className="film__meta">
        <span>{film.year}</span>
        {film.rating !== null && <span className="film__stars" aria-label={`${film.rating} out of 5 stars`}>{stars(film.rating)}</span>}
        <time dateTime={film.watched}>{day(film.watched)}</time>
      </span>
    </li>
  )
}

function Learning() {
  return (
    <div className="now__learn" data-reveal style={{ '--d': 120 } as CSSProperties}>
      <h3>Learning</h3>
      <p className="now__subject">{learning.subject}</p>
      <p className="now__with">{learning.with}</p>
    </div>
  )
}

// Right now: the song on Spotify, the last films from Letterboxd, and what
// den is learning. Each part shows only what is real; the receiver appears
// once Spotify is connected and has played something.
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

  const watching = films.length > 0 && (
    <div className="now__watch">
      <div className="now__row">
        <h3>Watching</h3>
        <a className="now__more" href={LETTERBOXD} target="_blank" rel="noreferrer">My diary on Letterboxd</a>
      </div>
      <ul className="films">
        {films.slice(0, radio ? 6 : 4).map((f, i) => <Poster film={f} i={i} key={f.url} />)}
      </ul>
    </div>
  )

  return (
    <section className="now" id="now" ref={ref} aria-labelledby="now-title">
      <div className="container">
        <div className="horizon" aria-hidden="true" />
        <div className="now__head">
          <h2 id="now-title" data-reveal="head">Right now.</h2>
          <p className="lead" data-reveal style={{ '--d': 150 } as CSSProperties}>What I’m playing, watching and learning, as it happens.</p>
        </div>

        {radio ? (
          <div className="now__body now__body--radio">
            <Receiver listening={radio} />
            <Learning />
            {watching}
          </div>
        ) : (
          <div className="now__body">
            {watching}
            <div className="now__side"><Learning /></div>
          </div>
        )}
      </div>
    </section>
  )
}
