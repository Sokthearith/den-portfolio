import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { FieldNode } from '../data/projects'

// The render's exploded hold, in seconds: the labels show while the parts are
// apart (it lifts from 1.5 s, holds about 5 to 7 s, closes by 9.5 s).
const APART: [number, number] = [4.6, 7.6]

// den's render of the Agrix field node, coming apart and closing again on a
// loop, with a label on each real part. It plays only while it is on screen;
// under reduced motion it rests on its exploded frame with a Play button.
export function FieldNodeView({ node }: { node: FieldNode }) {
  const video = useRef<HTMLVideoElement>(null)
  const [apart, setApart] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [still, setStill] = useState(false)

  useEffect(() => {
    const v = video.current
    if (!v) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    setStill(reduced)
    const onTime = () => setApart(v.paused || (v.currentTime >= APART[0] && v.currentTime <= APART[1]))
    const onPlay = () => { setPlaying(true); onTime() }
    const onPause = () => { setPlaying(false); setApart(true) }
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    let io: IntersectionObserver | undefined
    if (!reduced) {
      // On a card turned away from the viewer (an inert face) it waits.
      io = new IntersectionObserver(([e]) => { if (e.isIntersecting && !v.closest('[inert]')) v.play().catch(() => {}); else v.pause() }, { threshold: 0.25 })
      io.observe(v)
    }
    return () => {
      io?.disconnect()
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
    }
  }, [])

  const toggle = () => { const v = video.current; if (v) { if (v.paused) v.play().catch(() => {}); else v.pause() } }

  return (
    <figure className="node" data-apart={apart || undefined}>
      <figcaption className="node__caption">{node.caption}</figcaption>
      <div className="node__stage">
        <div className="node__plate">
          <video ref={video} className="node__video" muted loop playsInline preload="metadata" poster={node.poster} aria-label={node.alt} width={960} height={960}>
            <source src={node.webm} type="video/webm" />
            <source src={node.mp4} type="video/mp4" />
          </video>
        </div>
        {/* On a phone there is no room beside the render for leaders, so
            each part carries its number and the list below says what it is. */}
        <div className="node__marks" aria-hidden="true">
          {node.parts.map((p, i) => (
            <span className="node__mark" key={p.name} style={{ '--x': p.at[0], '--y': p.at[1] } as CSSProperties}>{i + 1}</span>
          ))}
        </div>
        <ol className="node__parts">
          {node.parts.map((p) => (
            <li className="node__part" key={p.name} style={{ '--x': p.at[0], '--y': p.at[1] } as CSSProperties}>
              <span className="node__dot" aria-hidden="true" />
              <svg className="node__lead" viewBox="0 0 100 2" preserveAspectRatio="none" aria-hidden="true">
                <line x1="0" y1="1" x2="100" y2="1" vectorEffect="non-scaling-stroke" />
              </svg>
              <span className="node__label">
                <span className="node__name">{p.name}</span>
                <span className="node__detail">{p.detail}</span>
              </span>
            </li>
          ))}
        </ol>
        {still && (
          <button className="node__play" type="button" onClick={toggle} aria-pressed={playing}>
            {playing ? 'Pause' : 'Play'}
          </button>
        )}
      </div>
    </figure>
  )
}
