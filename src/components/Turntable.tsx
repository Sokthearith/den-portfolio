import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { gsap } from 'gsap'
import type { Listening } from '../lib/now'
import { ago } from '../lib/time'

const clock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Where the song is now: the server's position plus the time since it said
// so, ticking once a second while the song plays.
function useProgress(l: Listening) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!l.playing) return
    const id = window.setInterval(() => { if (!document.hidden) setNow(Date.now()) }, 1000)
    return () => window.clearInterval(id)
  }, [l.playing])
  if (!l.track) return { elapsed: 0, share: 0 }
  const duration = l.track.durationMs || 1
  const elapsed = l.playing && l.at !== undefined ? Math.min(duration, (l.progressMs ?? 0) + (now - l.at)) : 0
  return { elapsed, share: elapsed / duration }
}

// The deck's geometry, in the drawing's units: the record turns round C, the
// arm swings round its pivot P, and the stylus sits L from the pivot, a few
// degrees off the arm's line where the headshell bends.
const C = { x: 250, y: 250 }
const P = { x: 520, y: 80 }
const STYLUS = { x: 507, y: 400 }
const L = Math.hypot(STYLUS.x - P.x, STYLUS.y - P.y)
const BEND = Math.atan2(P.x - STYLUS.x, STYLUS.y - P.y)
const D = Math.hypot(C.x - P.x, C.y - P.y)
const TOWARD_C = Math.atan2(P.x - C.x, C.y - P.y)
const OUTER = 216
const INNER = 100
// The arm's turn, in degrees from rest, that puts the stylus r from the centre.
const armAt = (r: number) => ((TOWARD_C - Math.acos((L * L + D * D - r * r) / (2 * L * D)) - BEND) * 180) / Math.PI

const GROOVES = Array.from({ length: 47 }, (_, i) => INNER + 2 + i * 2.5)
const GAPS = [128, 156, 188]
const wedge = (from: number, to: number) => [from, to].map((a) => `${C.x + Math.cos((a * Math.PI) / 180) * 240},${C.y + Math.sin((a * Math.PI) / 180) * 240}`).join(' ')

// The night shift's record player: the song playing or last played turns on
// the platter with its cover as the label, the arm rides from the outer groove
// to the inner as the song goes on, and the records before it lean in a crate.
export default function Turntable({ listening }: { listening: Listening }) {
  const track = listening.track!
  const { elapsed, share } = useProgress(listening)
  const recent = listening.recent ?? []
  const onAir = Boolean(listening.playing)
  const id = useId().replace(/:/g, '')
  const disc = useRef<SVGGElement>(null)
  const spin = useRef<gsap.core.Tween | null>(null)

  // 33⅓ turns a minute is 1.8 s a turn. Off air the platter runs down to a
  // stop instead of halting; under reduced motion it never turns.
  useEffect(() => {
    if (!disc.current) return
    const t = gsap.to(disc.current, { rotation: 360, svgOrigin: `${C.x} ${C.y}`, duration: 1.8, ease: 'none', repeat: -1, paused: true })
    spin.current = t
    return () => { gsap.killTweensOf(t); t.kill(); spin.current = null }
  }, [])
  useEffect(() => {
    const t = spin.current
    if (!t || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.killTweensOf(t)
    if (onAir) {
      t.timeScale(0.001).play()
      gsap.to(t, { timeScale: 1, duration: 1.4, ease: 'power1.in' })
    } else if (!t.paused()) {
      gsap.to(t, { timeScale: 0.001, duration: 2.8, ease: 'power2.out', onComplete: () => { t.pause() } })
    }
  }, [onAir])

  const arm = onAir ? armAt(OUTER - share * (OUTER - INNER)) : 0
  const said = `${track.title} by ${track.artist}`

  return (
    <div className="deck" data-on-air={onAir}>
      <div className="deck__plate">
        <svg viewBox="-24 -24 648 548" role="img" aria-label={onAir ? `A record player playing ${said}` : `A record player at rest, with ${said} on the platter`}>
          <defs>
            <clipPath id={`${id}-label`}><circle cx={C.x} cy={C.y} r="78" /></clipPath>
            <clipPath id={`${id}-vinyl`}><circle cx={C.x} cy={C.y} r="222" /></clipPath>
          </defs>
          <rect className="deck__button" x="34" y="438" width="62" height="28" />
          <circle className="deck__platter" cx={C.x} cy={C.y} r="232" />
          <g className="deck__disc" ref={disc}>
            <circle className="deck__vinyl" cx={C.x} cy={C.y} r="222" />
            {GROOVES.map((r) => <circle key={r} className="deck__groove" cx={C.x} cy={C.y} r={r} />)}
            {GAPS.map((r) => <circle key={r} className="deck__gap" cx={C.x} cy={C.y} r={r} />)}
            {track.art
              ? <image href={track.art} x={C.x - 78} y={C.y - 78} width="156" height="156" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id}-label)`} />
              : <circle className="deck__label" cx={C.x} cy={C.y} r="78" />}
            <circle className="deck__hole" cx={C.x} cy={C.y} r="6" />
          </g>
          {/* The room's light lies across the record and stays put while it turns. */}
          <g clipPath={`url(#${id}-vinyl)`}>
            <polygon className="deck__sheen" points={`${C.x},${C.y} ${wedge(-62, -50)}`} />
            <polygon className="deck__sheen" points={`${C.x},${C.y} ${wedge(118, 130)}`} />
          </g>
          <circle className="deck__spindle" cx={C.x} cy={C.y} r="3.5" />

          <rect className="deck__rest" x="534" y="330" width="14" height="36" />
          <circle className="deck__pivot" cx={P.x} cy={P.y} r="30" />
          <g className="deck__arm" style={{ '--arm': `${arm.toFixed(2)}deg` } as CSSProperties}>
            <rect className="deck__weight" x="504" y="16" width="32" height="38" />
            <rect className="deck__tube" x="516" y="40" width="8" height="302" />
            <polygon className="deck__tube" points="516,340 524,340 516,374 508,374" />
            <rect className="deck__shell" x="497" y="368" width="22" height="34" transform="rotate(14 508 385)" />
          </g>
          <circle className="deck__cap" cx={P.x} cy={P.y} r="12" />
        </svg>
      </div>

      <div className="deck__text">
        <h3>Listening</h3>
        <p className="deck__state" role="status">
          {onAir ? 'On air' : listening.playedAt ? `Off air, last played ${ago(listening.playedAt)}` : 'Off air'}
        </p>
        <p className="deck__title"><a href={track.url} target="_blank" rel="noreferrer">{track.title}</a></p>
        <p className="deck__artist">{track.artist}</p>
        <p
          className="deck__time"
          role="progressbar" aria-label="Song position" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)}
          aria-valuetext={onAir ? `${clock(elapsed)} of ${clock(track.durationMs)}` : 'not playing'}
        >
          {onAir ? `${clock(elapsed)} of ${clock(track.durationMs)}` : `${clock(track.durationMs)} long`}
        </p>

        {recent.length > 0 && (
          <div className="crate">
            <h4>Before that</h4>
            <ul className="crate__sleeves">
              {recent.map((p, i) => (
                <li key={`${p.url}-${p.playedAt}`} style={{ '--lean': `${[-4, 2, -1, 3, -2][i % 5]}deg` } as CSSProperties}>
                  <a className="sleeve" href={p.url} target="_blank" rel="noreferrer">
                    {p.art ? <img src={p.art} alt="" width={300} height={300} loading="lazy" /> : <span className="sleeve__blank" />}
                    <span className="sleeve__note">
                      <span className="sleeve__song">{p.title}</span>
                      <span className="sleeve__by">{p.artist}, <time dateTime={p.playedAt}>{ago(p.playedAt)}</time></span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
