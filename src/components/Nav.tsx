import { useEffect, useState } from 'react'
import { Moon, Search, Sun } from 'lucide-react'
import { profile } from '../data/profile'
import { published } from '../lib/notes'
import { toggleTheme, useTheme } from '../lib/theme'

// Absolute, so the links work from any page, not just the home page.
const links = [
  { href: '/#work', id: 'work', label: 'Work' },
  { href: '/#skills', id: 'skills', label: 'Skills' },
  { href: '/#about', id: 'about', label: 'About' },
  { href: '/#now', id: 'now', label: 'Now' },
  // Notes joins the nav once there is a note to read (drafts count while developing).
  ...(published.length || import.meta.env.DEV ? [{ href: '/notes', id: '/notes', label: 'Notes' }] : []),
  { href: '/lab', id: '/lab', label: 'Lab' },
]

// A plain line of words in the top right: the links, two small tools, and the
// one action. On the home page the name is the hero's, so the bar has none.
export default function Nav({ home }: { home: boolean }) {
  const [open, setOpen] = useState(false)
  const [here, setHere] = useState('')
  const theme = useTheme()

  // On another page, that page's link reads as current.
  useEffect(() => {
    if (location.pathname !== '/') setHere(location.pathname.replace(/\/+$/, '').replace(/^(\/notes)\/.+$/, '$1'))
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className="nav" data-home={home || undefined}>
      {!home && <a className="nav__mark" href="/" aria-label={`${profile.wordmark}, home`}>{profile.wordmark}</a>}
      <nav className="nav__bar" aria-label="Main">
        <button className="nav__menu" type="button" aria-expanded={open} aria-controls="nav-links" onClick={() => setOpen((o) => !o)}>
          {open ? 'Close' : 'Menu'}
        </button>
        <ul className="nav__links" id="nav-links" data-open={open}>
          {links.map((l) => (
            <li key={l.href}><a href={l.href} aria-current={here === l.id ? 'page' : undefined} onClick={() => setOpen(false)}>{l.label}</a></li>
          ))}
        </ul>
        <button className="nav__icon nav__jump" type="button" aria-label="Jump to a place or action (Ctrl K)" title="Jump to… (Ctrl K)" onClick={() => window.dispatchEvent(new Event('palette:open'))}>
          <Search size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <button className="nav__icon" type="button" aria-label="Dawn mode" aria-pressed={theme === 'dawn'} title={theme === 'dawn' ? 'Back to night' : 'Switch to dawn'} onClick={toggleTheme}>
          {theme === 'dawn' ? <Moon size={18} strokeWidth={1.75} aria-hidden="true" /> : <Sun size={18} strokeWidth={1.75} aria-hidden="true" />}
        </button>
        <a className="btn btn--primary btn--small" href={`mailto:${profile.email}`}>Email me</a>
      </nav>
    </header>
  )
}
