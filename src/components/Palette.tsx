import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { profile } from '../data/profile'
import { routes } from '../routes'
import { toggleTheme, useTheme } from '../lib/theme'

type Command = { id: string; label: string; kind: string; keywords?: string; run: () => void | Promise<void> }

// Goes to a section of the home page: scrolls when we are on it, navigates
// when we are not.
function goTo(id: string) {
  const el = document.getElementById(id)
  if (el && location.pathname === '/') {
    el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    history.replaceState(null, '', `#${id}`)
  } else {
    location.href = `/#${id}`
  }
}

// The Ctrl+K palette: every place and action on the site, a few keystrokes
// away. A real <dialog> for focus and Esc; the list is a combobox and listbox.
export default function Palette() {
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const [status, setStatus] = useState('')
  const theme = useTheme()
  const list = useId()

  const close = useCallback(() => dialog.current?.close(), [])

  const commands = useMemo<Command[]>(() => {
    const pages = routes
      .filter((r) => r.path !== '/' && r.path !== '/404')
      .map((r) => ({ id: `page-${r.path}`, label: r.title.split(',')[0], kind: 'Page', run: () => { location.href = r.path } }))
    return [
      { id: 'top', label: 'Top of the page', kind: 'Section', keywords: 'home hero start', run: () => goTo('top') },
      { id: 'work', label: 'Work', kind: 'Section', keywords: 'projects agrix planify', run: () => goTo('work') },
      { id: 'skills', label: 'Skills', kind: 'Section', keywords: 'stack rack keys', run: () => goTo('skills') },
      { id: 'about', label: 'About', kind: 'Section', keywords: 'cadt student', run: () => goTo('about') },
      ...pages,
      {
        id: 'copy', label: 'Copy my email', kind: 'Action', keywords: 'contact clipboard address',
        run: async () => {
          try {
            await navigator.clipboard.writeText(profile.email)
            setStatus(`Copied ${profile.email}`)
            window.setTimeout(close, 1100)
          } catch {
            setStatus(`Could not reach the clipboard. The address is ${profile.email}`)
          }
        },
      },
      { id: 'email', label: 'Write me an email', kind: 'Action', keywords: 'contact hire mail', run: () => { location.href = `mailto:${profile.email}` } },
      { id: 'github', label: 'Open GitHub', kind: 'Link', keywords: 'code repositories', run: () => { window.open(profile.links.github, '_blank', 'noopener') } },
      { id: 'linkedin', label: 'Open LinkedIn', kind: 'Link', keywords: 'profile cv', run: () => { window.open(profile.links.linkedin, '_blank', 'noopener') } },
      { id: 'theme', label: theme === 'dawn' ? 'Back to night' : 'Switch to dawn', kind: 'Action', keywords: 'theme light dark mode', run: toggleTheme },
      { id: 'light', label: 'Turn on a light', kind: 'Action', keywords: 'window night sky', run: () => { goTo('top'); window.dispatchEvent(new Event('night:light')) } },
    ]
  }, [theme, close])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter((c) => `${c.label} ${c.kind} ${c.keywords ?? ''}`.toLowerCase().includes(q))
  }, [commands, query])

  const open = useCallback(() => {
    const d = dialog.current
    if (!d || d.open) return
    setQuery('')
    setIndex(0)
    setStatus('')
    d.showModal()
    input.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest('input, textarea, [contenteditable="true"]')
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (dialog.current?.open) close()
        else open()
      } else if (e.key === '/' && !typing && !dialog.current?.open) {
        e.preventDefault()
        open()
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('palette:open', open)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('palette:open', open)
    }
  }, [open, close])

  const run = async (c: Command | undefined) => {
    if (!c) return
    if (c.id !== 'copy') close()
    await c.run()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => (i + 1) % Math.max(shown.length, 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => (i - 1 + shown.length) % Math.max(shown.length, 1)) }
    else if (e.key === 'Home') { e.preventDefault(); setIndex(0) }
    else if (e.key === 'End') { e.preventDefault(); setIndex(Math.max(shown.length - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); run(shown[index]) }
  }

  const active = shown[index]

  return (
    <dialog
      className="palette"
      ref={dialog}
      aria-label="Jump to a place or run an action"
      onClick={(e) => { if (e.target === dialog.current) close() }}
    >
      <div className="palette__panel">
        <label className="visually-hidden" htmlFor={`${list}-input`}>Jump to a place or run an action</label>
        <input
          id={`${list}-input`}
          ref={input}
          className="palette__input"
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={list}
          aria-autocomplete="list"
          aria-activedescendant={active ? `${list}-${active.id}` : undefined}
          placeholder="Jump to or do something"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIndex(0) }}
          onKeyDown={onKeyDown}
        />
        <ul className="palette__list" id={list} role="listbox" aria-label="Places and actions">
          {shown.map((c, i) => (
            <li
              key={c.id}
              id={`${list}-${c.id}`}
              role="option"
              aria-selected={i === index}
              className="palette__item"
              onMouseMove={() => setIndex(i)}
              onClick={() => run(c)}
            >
              <span>{c.label}</span>
              <span className="palette__kind">{c.kind}</span>
            </li>
          ))}
          {shown.length === 0 && <li className="palette__empty" role="presentation">Nothing matches “{query}”. Try work, email or dawn.</li>}
        </ul>
        <p className="palette__foot" aria-live="polite">
          {status || 'Arrow keys to move, Enter to go, Esc to close'}
        </p>
      </div>
    </dialog>
  )
}
