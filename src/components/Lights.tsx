import { useRef, useState, type CSSProperties, type FormEvent } from 'react'
import type { Light, LeaveError, PlacedLight } from '../lib/lights'
import { ago } from '../lib/time'

const MAX_MESSAGE = 140

// The windows visitors left on, laid over the drawn town at the same spots the
// shader lights them. Hover, focus or tap one to read its note; the note is
// only drawn while it is read, and the window's own name carries the words.
export function TownLights({ lights }: { lights: PlacedLight[] }) {
  const [near, setNear] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  if (!lights.length) return null

  return (
    <ul className="town" aria-label="Lights left on by visitors" onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(null); setNear(null) } }}>
      {lights.map((l) => {
        const who = l.name ?? 'someone'
        const when = l.mine ? 'only you see this until I read it' : ago(l.at)
        const isOpen = open === l.id
        const shown = isOpen || near === l.id
        return (
          <li
            key={l.id}
            className="town__light"
            style={{ left: `${l.x * 100}%`, '--row': l.row } as CSSProperties}
            data-edge={l.x < 0.2 ? 'start' : l.x > 0.8 ? 'end' : undefined}
            data-open={shown || undefined}
            onMouseEnter={() => setNear(l.id)}
            onMouseLeave={() => setNear((n) => (n === l.id ? null : n))}
          >
            <button
              className="town__window"
              type="button"
              onClick={() => setOpen(isOpen ? null : l.id)}
              onFocus={() => setNear(l.id)}
              onBlur={() => { setNear((n) => (n === l.id ? null : n)); setOpen((o) => (o === l.id ? null : o)) }}
            >
              <span className="visually-hidden">{who}, {when}: “{l.message}”</span>
            </button>
            {shown && (
              <p className="town__note" aria-hidden="true">
                <span className="town__message">“{l.message}”</span>
                <span className="town__by">{who}, {when}</span>
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}

const said: Record<'on' | LeaveError, string> = {
  on: 'Your light is on. Everyone else sees it once I’ve read it.',
  rate: 'That’s three lights from you today. Come back tomorrow.',
  invalid: 'A note needs a few words, up to 140 characters.',
  down: 'The light didn’t catch. Try again in a minute.',
}

type Leave = (name: string, message: string, website: string) => Promise<{ light?: Light; error?: LeaveError }>

// The form folds away under one line. Sent, it folds again so the sender sees
// their window come on. Without JavaScript it posts itself and comes back to
// the matching #light-… note below, shown by :target.
export function LeaveLight({ onLeave }: { onLeave: Leave }) {
  const fold = useRef<HTMLDetailsElement>(null)
  const summary = useRef<HTMLElement>(null)
  const form = useRef<HTMLFormElement>(null)
  const [message, setMessage] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'on' | LeaveError>('idle')

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setState('sending')
    const out = await onLeave(String(f.get('name') ?? ''), String(f.get('message') ?? ''), String(f.get('website') ?? ''))
    if (out.light) {
      form.current?.reset()
      setMessage('')
      setState('on')
      if (fold.current) fold.current.open = false
      summary.current?.focus()
    } else {
      setState(out.error ?? 'down')
    }
  }

  const left = MAX_MESSAGE - [...message].length

  return (
    <div className="leave">
      <details className="leave__fold" ref={fold} onToggle={(e) => { if (e.currentTarget.open && state === 'on') setState('idle') }}>
        <summary className="leave__summary" ref={summary}>Leave a light on</summary>
        <form className="leave__form" ref={form} action="/api/lights" method="post" onSubmit={submit}>
          <p className="leave__lede">Leave a note. Once I’ve read it, a window stays lit in the town below.</p>
          <label className="field">
            <span className="field__label">Name <span className="field__hint">optional</span></span>
            <input className="field__input" name="name" maxLength={32} autoComplete="nickname" />
          </label>
          <label className="field">
            <span className="field__label">Note</span>
            <textarea className="field__input" name="message" required maxLength={MAX_MESSAGE} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} aria-describedby="leave-count" />
          </label>
          {/* A field only bots fill in. */}
          <label className="leave__trap" aria-hidden="true">
            Website <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
          <div className="leave__row">
            <button className="btn btn--small" type="submit" disabled={state === 'sending'}>Leave it on</button>
            <span className="leave__count" id="leave-count" data-low={left < 20 || undefined}>{left} left</span>
          </div>
        </form>
      </details>
      <p className="leave__status" role="status">{state !== 'idle' && state !== 'sending' ? said[state] : ''}</p>
      {(Object.keys(said) as (keyof typeof said)[]).map((k) => (
        <p key={k} className="leave__said" id={`light-${k}`}>{said[k]}</p>
      ))}
    </div>
  )
}
