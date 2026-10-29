import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { Film } from '../lib/now'

const LETTERBOXD = 'https://letterboxd.com/den4u/'

const rated = (r: number) => `${Math.floor(r) || ''}${r % 1 ? '½' : ''} of 5`
const day = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

// A film projector seen from the side: two reels on their arms, the body, and
// the lens at the right whose glass is the light. The lens tip is at the
// drawing's right edge, 65% of the way down, where the beam starts.
function Machine() {
  const reel = (cx: number, cy: number, r: number) => (
    <g className="cinema__reel">
      <circle className="cinema__reel-rim" cx={cx} cy={cy} r={r} />
      {[-90, 30, 150].map((a) => (
        <circle key={a} className="cinema__reel-hole" cx={cx + Math.cos((a * Math.PI) / 180) * r * 0.52} cy={cy + Math.sin((a * Math.PI) / 180) * r * 0.52} r={r * 0.24} />
      ))}
      <circle className="cinema__reel-hub" cx={cx} cy={cy} r={r * 0.15} />
    </g>
  )
  return (
    <svg className="cinema__projector" viewBox="0 0 240 200" aria-hidden="true">
      <path className="cinema__film" d="M24 58 L42 102 M212 62 L194 102" />
      <rect className="cinema__metal" x="66" y="58" width="8" height="44" />
      <rect className="cinema__metal" x="168" y="62" width="8" height="40" />
      {reel(70, 58, 46)}
      {reel(172, 62, 40)}
      <rect className="cinema__body" x="34" y="100" width="150" height="64" />
      <rect className="cinema__door" x="48" y="112" width="74" height="40" />
      <rect className="cinema__slot" x="56" y="120" width="58" height="4" />
      <rect className="cinema__slot" x="56" y="130" width="58" height="4" />
      <rect className="cinema__slot" x="56" y="140" width="58" height="4" />
      <circle className="cinema__door" cx="152" cy="132" r="11" />
      <rect className="cinema__metal" x="46" y="164" width="14" height="22" />
      <rect className="cinema__metal" x="158" y="164" width="14" height="22" />
      <rect className="cinema__body" x="184" y="118" width="40" height="24" />
      <rect className="cinema__metal" x="222" y="112" width="14" height="36" />
      <rect className="cinema__glass" x="236" y="116" width="4" height="28" />
    </svg>
  )
}

// The films as a cinema: the projector throws den's latest posters onto the
// screen one at a time as the page scrolls, and under the screen sits a torn
// stub for each, the one showing lit. Without script, under reduced motion and
// in the prerendered page it rests: the latest film on the screen and every
// stub in a row beneath it.
export default function Projector({ films }: { films: Film[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const reel = films.map((f) => f.url).join(' ')

  useEffect(() => {
    const root = ref.current
    const n = films.length
    if (!root || n < 2) return
    gsap.registerPlugin(ScrollTrigger)
    const q = gsap.utils.selector(root)
    const stubs = q('.cinema__stub') as HTMLElement[]
    const light = (i: number) => stubs.forEach((s, k) => s.toggleAttribute('data-current', k === i))
    const mm = gsap.matchMedia()

    mm.add({ motion: '(prefers-reduced-motion: no-preference)', phone: '(max-width: 47.99rem)' }, (c) => {
      if (!c.conditions?.motion) return
      // About one screen for every two or three films.
      root.classList.add('is-live')
      root.style.setProperty('--hold', String(Math.max(1, n / (c.conditions.phone ? 3 : 2.4))))

      const posters = q('.cinema__poster')
      const row = q('.cinema__stubs')[0] as HTMLElement
      // The stub row slides so the lit stub stays in view when the row is
      // wider than the stage; when it fits, it stays put.
      const shift = (k: number) => () => {
        const view = row.parentElement!.clientWidth
        const s = stubs[k]
        return -gsap.utils.clamp(0, Math.max(0, row.scrollWidth - view), s.offsetLeft + s.offsetWidth / 2 - view / 2)
      }

      gsap.set(posters.slice(1), { yPercent: 100 })
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root, start: 'top top', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true,
          onUpdate: (self) => light(Math.min(n - 1, Math.floor(self.progress * n))),
        },
      })
      tl.to(q('.cinema__reel'), { rotation: 360 * n, transformOrigin: '50% 50%', duration: 1 }, 0)
      // Between films the frame slips in the gate: the poster runs up out of
      // the screen as the next runs in, and the light dips while it moves.
      const slip = 0.28 / n
      for (let k = 1; k < n; k++) {
        const at = k / n - slip / 2
        tl.to(posters[k - 1], { yPercent: -100, duration: slip }, at)
          .to(posters[k], { yPercent: 0, duration: slip }, at)
          .to(q('.cinema__light'), { opacity: 0.35, duration: slip / 2 }, at)
          .to(q('.cinema__light'), { opacity: 1, duration: slip / 2 }, at + slip / 2)
          .to(row, { x: shift(k), duration: slip }, at)
      }
      return () => { root.classList.remove('is-live'); root.style.removeProperty('--hold'); light(0) }
    })
    document.fonts?.ready.then(() => ScrollTrigger.refresh())
    return () => mm.revert()
    // The reel is rebuilt only when the films themselves change.
  }, [reel])

  return (
    <div className="cinema scene" data-scene="projector" ref={ref}>
      <div className="cinema__stage scene-stage">
        <div className="cinema__cell">
          <div className="cinema__room">
            <Machine />
            <div className="cinema__light" aria-hidden="true"><div className="cinema__beam" /></div>
            <div className="cinema__screen">
              {films.map((f) => f.poster
                ? <img className="cinema__poster" key={f.url} src={f.poster} alt={`Poster for ${f.title}`} width={600} height={900} decoding="async" />
                : <p className="cinema__poster cinema__poster--bare" key={f.url}>{f.title}</p>)}
            </div>
          </div>
        </div>

        <div className="cinema__foot">
          <h3>Watching</h3>
          <a className="nowroom__more" href={LETTERBOXD} target="_blank" rel="noreferrer">My diary on Letterboxd</a>
        </div>
        <div className="cinema__strip">
          <ol className="cinema__stubs">
            {films.map((f, i) => (
              <li className="cinema__stub" key={f.url} data-current={i === 0 || undefined}>
                <a href={f.url} target="_blank" rel="noreferrer">
                  <span className="cinema__title">{f.title}</span>
                  <span className="cinema__about">
                    <span>{f.year}</span>
                    {f.rating !== null && <span aria-label={`${f.rating} out of 5 stars`}>{rated(f.rating)}</span>}
                    <time dateTime={f.watched}>{day(f.watched)}</time>
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
