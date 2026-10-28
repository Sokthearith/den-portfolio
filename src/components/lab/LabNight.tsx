import { lazy, Suspense, useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { useReducedMotion } from '../../lib/hooks'
import { createNightInput, lightWindow } from '../../lib/night'

const NightScene = lazy(() => import('../canvas/NightScene'))

// The hero's night with its dials out on the bench: the hour, the rain, and a
// switch for one more light.
export default function LabNight() {
  const stage = useRef<HTMLDivElement>(null)
  const input = useRef(createNightInput())
  const [near, setNear] = useState(false)
  const [seen, setSeen] = useState(false)
  const [still, setStill] = useState(false)
  const [hour, setHour] = useState(0)
  const [rain, setRain] = useState(0.5)
  const reduced = useReducedMotion()
  const running = seen && !reduced && !still

  useEffect(() => {
    const el = stage.current
    if (!el) return
    const nearIo = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); nearIo.disconnect() } }, { rootMargin: '400px 0px' })
    const seenIo = new IntersectionObserver(([e]) => setSeen(e.isIntersecting))
    nearIo.observe(el)
    seenIo.observe(el)
    return () => { nearIo.disconnect(); seenIo.disconnect() }
  }, [])

  useEffect(() => {
    input.current.lightsOut = hour
    input.current.rain = rain
    input.current.invalidate?.()
  }, [hour, rain])

  const track = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    input.current.x = e.clientX - r.left
    input.current.y = e.clientY - r.top
    input.current.inside = true
  }
  const light = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    lightWindow(input.current, (e.clientX - r.left) / r.width, !running)
  }

  return (
    <div className="labnight">
      <div
        className="labnight__stage"
        ref={stage}
        onPointerMove={track}
        onPointerLeave={() => { input.current.inside = false }}
        onPointerUp={(e) => { if (e.pointerType !== 'mouse') input.current.inside = false }}
        onClick={light}
      >
        <div className="night" aria-hidden="true">
          {near && (
            <Suspense fallback={null}>
              <NightScene running={running} input={input} onStill={() => setStill(true)} />
            </Suspense>
          )}
          <div className="night__grain" />
        </div>
      </div>
      <div className="labnight__dials">
        <label className="dial">
          <span className="dial__name">The hour</span>
          <input type="range" min={0} max={100} value={Math.round(hour * 100)} onChange={(e) => setHour(Number(e.target.value) / 100)} aria-valuetext={hour < 0.1 ? 'early, the town awake' : hour > 0.9 ? 'late, only one light on' : 'getting late'} />
          <span className="dial__value">{hour < 0.1 ? 'Awake' : hour > 0.9 ? 'Asleep' : 'Late'}</span>
        </label>
        <label className="dial">
          <span className="dial__name">Rain</span>
          <input type="range" min={0} max={100} value={Math.round(rain * 100)} onChange={(e) => setRain(Number(e.target.value) / 100)} aria-valuetext={`${Math.round(rain * 100)} percent`} />
          <span className="dial__value">{Math.round(rain * 100)}</span>
        </label>
        <button className="btn btn--small" type="button" onClick={() => lightWindow(input.current, 0.08 + Math.random() * 0.84, !running)}>Turn on a light</button>
      </div>
    </div>
  )
}
