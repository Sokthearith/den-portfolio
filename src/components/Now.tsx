import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { now as learning } from '../data/profile'
import { useNow, type Film, type Listening } from '../lib/now'
import Receiver from './Receiver'
import '../styles/now.css'

const LETTERBOXD = 'https://letterboxd.com/den4u/'

const rated = (r: number) => `${Math.floor(r) || ''}${r % 1 ? '½' : ''} of 5`
const day = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

// Where each picture hangs round the heading, on a stage 100 units wide and
// 105 tall: its left edge, top edge and width, and how far it drifts (in % of
// its own height, signed so the cluster loosens as it passes). The first two
// sit just clear of the heading's block, so the pictures read as gathered
// round it.
type Slot = { x: number; y: number; w: number; drift: number }
const SLOTS: Slot[] = [
  { x: 5, y: 30, w: 20, drift: 6 },
  { x: 75, y: 61, w: 21, drift: -10 },
  { x: 33, y: 3, w: 18, drift: 4 },
  { x: 62, y: 5, w: 19, drift: 8 },
  { x: 81, y: 38, w: 16, drift: -12 },
  { x: 8, y: 68, w: 18, drift: -5 },
  { x: 38, y: 72, w: 18, drift: -9 },
  { x: 4, y: 4, w: 14, drift: 7 },
]
// Films keep their places whether or not Spotify answers; the record playing
// takes the sixth film's place beside the heading, and two earlier records
// the two square places. 4 and 7 only ever hold a cover.
const FILM_SLOTS = [1, 2, 3, 5, 6, 0]
const ART_SLOTS = [0, 4, 7]

type Picture = { key: string; src: string; alt: string; width: number; height: number; slot: number; phone: number }

function pictures(films: Film[], radio: Listening | null): Picture[] {
  const posters: Picture[] = films.flatMap((f, i) => f.poster
    ? [{ key: f.url, src: f.poster, alt: `Poster for ${f.title}`, width: 600, height: 900, slot: FILM_SLOTS[i], phone: -1 }]
    : [])
  const records = radio?.track ? [radio.track, ...(radio.recent ?? [])] : []
  const covers: Picture[] = records
    .flatMap((r) => (r.art ? [{ ...r, art: r.art }] : []))
    .filter((c, i, all) => all.findIndex((d) => d.art === c.art) === i)
    .slice(0, ART_SLOTS.length)
    .map((c, i) => ({ key: c.art, src: c.art, alt: `Cover of ${c.album} by ${c.artist}`, width: 300, height: 300, slot: ART_SLOTS[i], phone: -1 }))
  // On a phone five of them stay, two above the heading and three below: the
  // latest record first, then the films in the order they were watched.
  const phone = [...covers.slice(0, 1), ...posters]
  phone.slice(0, 5).forEach((p, i) => { p.phone = i })
  return [...posters, ...covers]
}

function Watching({ films }: { films: Film[] }) {
  return (
    <div className="nowroom__watch" data-reveal>
      <h3>Watching</h3>
      <ol className="nowroom__films">
        {films.map((f) => (
          <li key={f.url}>
            <a href={f.url} target="_blank" rel="noreferrer">{f.title}</a>
            <span className="nowroom__about">
              <span>{f.year}</span>
              {f.rating !== null && <span aria-label={`${f.rating} out of 5 stars`}>{rated(f.rating)}</span>}
              <time dateTime={f.watched}>{day(f.watched)}</time>
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function Learning() {
  return (
    <div className="nowroom__learn" data-reveal style={{ '--d': 120 } as CSSProperties}>
      <h3>Learning</h3>
      <p className="nowroom__subject">{learning.subject}</p>
      <p>{learning.with}</p>
    </div>
  )
}

// Right now: the films from Letterboxd and the records from Spotify hang
// round the heading like lit pictures in a dark room; beneath them, what they
// are. Each part shows only what is real, and the films are in the page
// before any script runs.
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
  const shown = films.slice(0, radio ? 5 : 6)
  const pics = pictures(shown, radio)

  return (
    <section className="nowroom" id="now" ref={ref} aria-labelledby="now-title">
      <div className="nowroom__band">
        <div className="nowroom__stage" data-empty={pics.length === 0 || undefined}>
          <div className="nowroom__heading">
            <h2 id="now-title" data-reveal="head">Right now.</h2>
            <p data-reveal style={{ '--d': 150 } as CSSProperties}>What I’m playing, watching and learning, as it happens.</p>
            <a className="nowroom__more" href={LETTERBOXD} target="_blank" rel="noreferrer" data-reveal style={{ '--d': 240 } as CSSProperties}>My diary on Letterboxd</a>
          </div>
          {pics.map((p, i) => {
            const s = SLOTS[p.slot]
            return (
              <div
                className="nowroom__pic"
                key={p.key}
                data-phone={p.phone}
                data-reveal
                style={{ '--x': s.x, '--y': s.y, '--w': s.w, '--drift': s.drift, '--d': 80 + i * 70, aspectRatio: `${p.width} / ${p.height}` } as CSSProperties}
              >
                <img src={p.src} alt={p.alt} width={p.width} height={p.height} loading="lazy" decoding="async" />
              </div>
            )
          })}
        </div>
      </div>

      <div className="nowroom__details" data-radio={Boolean(radio) || undefined}>
        {radio && <Receiver listening={radio} />}
        {shown.length > 0 && <Watching films={shown} />}
        <Learning />
      </div>
    </section>
  )
}
