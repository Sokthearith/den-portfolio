import { useEffect, useState } from 'react'
import { Moon, Search, Sun } from 'lucide-react'
import { profile } from '../data/profile'
import { toggleTheme, useTheme } from '../lib/theme'

// Absolute, so the links work from any page, not just the home page.
const links = [
  { href: '/#work', id: 'work', label: 'Work' },
  { href: '/#skills', id: 'skills', label: 'Skills' },
  { href: '/#about', id: 'about', label: 'About' },
]

export default function Nav() {
  const [open, setOpen] = useState(false)
  const [here, setHere] = useState('')
  const theme = useTheme()

  // The link for the section in the middle of the screen reads as current.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setHere(e.target.id) }),
      { rootMargin: '-45% 0px -50% 0px' },
    )
    ;['top', ...links.map((l) => l.id)].forEach((id) => {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className="nav">
      <nav className="nav__pill" aria-label="Main">
        <a className="nav__mark" href="/" aria-label={`${profile.wordmark}, home`}>{profile.wordmark}</a>
        <ul className="nav__links" id="nav-links" data-open={open}>
          {links.map((l) => (
            <li key={l.href}><a href={l.href} aria-current={here === l.id ? 'location' : undefined} onClick={() => setOpen(false)}>{l.label}</a></li>
          ))}
        </ul>
        <button className="nav__menu" type="button" aria-expanded={open} aria-controls="nav-links" onClick={() => setOpen((o) => !o)}>
          {open ? 'Close' : 'Menu'}
        </button>
        <div className="nav__tools">
          <button className="nav__icon nav__jump" type="button" aria-label="Jump to a place or action (Ctrl K)" title="Jump to… (Ctrl K)" onClick={() => window.dispatchEvent(new Event('palette:open'))}>
            <Search size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <button className="nav__icon" type="button" aria-label="Dawn mode" aria-pressed={theme === 'dawn'} title={theme === 'dawn' ? 'Back to night' : 'Switch to dawn'} onClick={toggleTheme}>
            {theme === 'dawn' ? <Moon size={18} strokeWidth={1.75} aria-hidden="true" /> : <Sun size={18} strokeWidth={1.75} aria-hidden="true" />}
          </button>
        </div>
        <a className="btn btn--small" href={`mailto:${profile.email}`}>Email me</a>
        <span className="nav__progress" aria-hidden="true" />
      </nav>
    </header>
  )
}
