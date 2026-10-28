import { Fragment, useEffect, useRef, type CSSProperties } from 'react'
import { profile } from '../../data/profile'

// The headline set in variable Instrument Sans: each letter widens and
// thickens as the pointer comes near, and settles back as it leaves.
const RADIUS = 220

export default function LeanType() {
  const line = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const el = line.current
    if (!el) return
    const letters = [...el.querySelectorAll<HTMLSpanElement>('.lean__l')]
    let centres: { x: number; y: number }[] = []
    let frame = 0
    let pointer: { x: number; y: number } | null = null

    const measure = () => {
      centres = letters.map((l) => {
        const r = l.getBoundingClientRect()
        return { x: r.left + r.width / 2 + window.scrollX, y: r.top + r.height / 2 + window.scrollY }
      })
    }
    const paint = () => {
      frame = 0
      letters.forEach((l, i) => {
        const c = centres[i]
        const d = pointer && c ? Math.hypot(pointer.x - c.x, pointer.y - c.y) : Infinity
        const k = d === Infinity ? 0 : Math.max(0, 1 - d / RADIUS) ** 2
        l.style.setProperty('--k', k.toFixed(3))
      })
    }
    const queue = () => { if (!frame) frame = requestAnimationFrame(paint) }
    const move = (e: PointerEvent) => { pointer = { x: e.pageX, y: e.pageY }; queue() }
    const leave = () => { pointer = null; queue() }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    document.fonts?.ready.then(measure)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    window.addEventListener('scroll', measure, { passive: true })
    return () => {
      ro.disconnect()
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
      window.removeEventListener('scroll', measure)
      cancelAnimationFrame(frame)
    }
  }, [])

  const words = profile.headline.split(' ')
  let n = 0

  return (
    <p className="lean" ref={line}>
      <span className="visually-hidden">{profile.headline}</span>
      {words.map((w, wi) => (
        <Fragment key={wi}>
          <span className="lean__w" aria-hidden="true">
            {[...w].map((ch) => <span className="lean__l" style={{ '--n': n++ } as CSSProperties} key={n}>{ch}</span>)}
          </span>
          {wi < words.length - 1 && ' '}
        </Fragment>
      ))}
    </p>
  )
}
