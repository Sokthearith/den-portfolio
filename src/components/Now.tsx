import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { now as learning } from '../data/profile'
import { useNow, type Film } from '../lib/now'

const LETTERBOXD = 'https://letterboxd.com/den4u/'

const stars = (r: number) => '★'.repeat(Math.floor(r)) + (r % 1 ? '½' : '')
const day = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

function ago(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins} minutes ago`
  const h = Math.round(mins / 60)
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`
  const d = Math.round(h / 24)
  return `${d} day${d === 1 ? '' : 's'} ago`
}

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

// Right now: the last films from Letterboxd, the song on Spotify, and what
// den is learning. Each part shows only what is real; the song appears once
// Spotify is connected.
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

  const track = listening?.configured ? listening.track : null

  return (
    <section className="now" id="now" ref={ref} aria-labelledby="now-title">
      <div className="container">
        <div className="horizon" aria-hidden="true" />
        <div className="now__head">
          <h2 id="now-title" data-reveal="head">Right now.</h2>
          <p className="lead" data-reveal style={{ '--d': 150 } as CSSProperties}>What I’m watching, playing and learning, as it happens.</p>
        </div>

        <div className="now__body">
        {films.length > 0 && (
          <div className="now__watch">
            <div className="now__row">
              <h3>Watching</h3>
              <a className="now__more" href={LETTERBOXD} target="_blank" rel="noreferrer">My diary on Letterboxd</a>
            </div>
            <ul className="films">
              {films.map((f, i) => <Poster film={f} i={i} key={f.url} />)}
            </ul>
          </div>
        )}

        <div className="now__side">
          {track && listening && (
            <div className="panel now__listen" data-reveal>
              <h3>Listening</h3>
              <div className="track">
                {track.art && <img className="track__art" src={track.art} alt="" width={300} height={300} loading="lazy" />}
                <div className="track__text">
                  <p className="track__state" role="status" data-playing={listening.playing}>
                    {listening.playing ? 'Playing now' : listening.playedAt ? `Last played ${ago(listening.playedAt)}` : 'Last played'}
                  </p>
                  <p className="track__title">{track.title}</p>
                  <p className="track__artist">{track.artist}</p>
                  <a className="now__more" href={track.url} target="_blank" rel="noreferrer">Open in Spotify</a>
                </div>
              </div>
            </div>
          )}
          <div className="now__learn" data-reveal style={{ '--d': 120 } as CSSProperties}>
            <h3>Learning</h3>
            <p className="now__subject">{learning.subject}</p>
            <p className="now__with">{learning.with}</p>
          </div>
        </div>
        </div>
      </div>
    </section>
  )
}
