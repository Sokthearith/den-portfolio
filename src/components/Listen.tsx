import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { setLevel, startSound, stopSound, useSound, type Layer } from '../lib/sound'

const layers: { id: Layer; name: string }[] = [
  { id: 'rain', name: 'Rain' },
  { id: 'wind', name: 'Wind' },
  { id: 'town', name: 'Town' },
]

// Listen, then a small machined mixer: three faders and a Stop. Sound starts
// only on this press; Stop or Esc ends it.
export default function Listen() {
  const { playing, levels } = useSound()
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => {
      if (!panel.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', away)
    return () => window.removeEventListener('pointerdown', away)
  }, [open])

  const press = async () => {
    if (!playing) {
      await startSound()
      setOpen(true)
    } else setOpen((o) => !o)
  }

  const stop = () => {
    stopSound()
    setOpen(false)
    button.current?.focus()
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      stop()
    }
  }

  return (
    <div className="listen" onKeyDown={onKey}>
      <button ref={button} className="btn btn--small listen__button" type="button" aria-expanded={open} aria-controls={id} data-playing={playing} onClick={press}>
        {playing ? 'Sounds' : 'Listen'}
      </button>
      {open && (
        <div className="listen__panel" id={id} ref={panel} role="group" aria-label="Night sounds">
          <div className="listen__faders">
            {layers.map((l) => {
              const v = Math.round(levels[l.id] * 100)
              return (
                <label className="fader" key={l.id}>
                  <span className="fader__value" aria-hidden="true">{v}</span>
                  <input
                    className="fader__input"
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={v}
                    aria-valuetext={`${l.name} ${v} percent`}
                    onChange={(e) => setLevel(l.id, Number(e.target.value) / 100)}
                  />
                  <span className="fader__name">{l.name}</span>
                </label>
              )
            })}
          </div>
          <button className="btn btn--small listen__stop" type="button" onClick={stop}>Stop</button>
        </div>
      )}
    </div>
  )
}
