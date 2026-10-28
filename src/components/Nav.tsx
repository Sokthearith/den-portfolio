import { useEffect, useState } from 'react'
import { profile } from '../data/profile'

const links = [
  { href: '#work', label: 'Work' },
  { href: '#skills', label: 'Skills' },
  { href: '#about', label: 'About' },
]

export default function Nav() {
  const [open, setOpen] = useState(false)
  const [here, setHere] = useState('')

  // The link for the section in the middle of the screen reads as current.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setHere(`#${e.target.id}`) }),
      { rootMargin: '-45% 0px -50% 0px' },
    )
    ;['top', ...links.map((l) => l.href.slice(1))].forEach((id) => {
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
        <a className="nav__mark" href="#top" aria-label={`${profile.wordmark}, back to the top`}>{profile.wordmark}</a>
        <ul className="nav__links" id="nav-links" data-open={open}>
          {links.map((l) => (
            <li key={l.href}><a href={l.href} aria-current={here === l.href ? 'location' : undefined} onClick={() => setOpen(false)}>{l.label}</a></li>
          ))}
        </ul>
        <button className="nav__menu" type="button" aria-expanded={open} aria-controls="nav-links" onClick={() => setOpen((o) => !o)}>
          {open ? 'Close' : 'Menu'}
        </button>
        <a className="btn btn--small" href={`mailto:${profile.email}`}>Email me</a>
        <span className="nav__progress" aria-hidden="true" />
      </nav>
    </header>
  )
}
