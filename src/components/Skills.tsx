import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { dailyTools, skillGroups } from '../data/skills'
import { projectsUsing } from '../data/projects'
import { useMediaQuery, useReducedMotion } from '../lib/hooks'
import { useTheme } from '../lib/theme'
import '../styles/skills.css'

const SkillRack = lazy(() => import('./canvas/SkillRack'))

type RackScroll = { value: number; rise?: number; invalidate?: () => void }

type Props = { active: string; onPress: (name: string) => void }

// The short note at the right of each row: how many projects light up.
function count(skill: string) {
  const n = projectsUsing(skill).length
  if (n > 0) return `${n} project${n > 1 ? 's' : ''}`
  return dailyTools.includes(skill) ? 'Every day' : ''
}

// Opens under the pressed row: the projects built with it, as links.
function Used({ skill }: { skill: string }) {
  const used = projectsUsing(skill)
  return (
    <p className="skillset__used" id="skills-used">
      {used.length > 0 ? (
        <>
          Used in{' '}
          {used.map((p, i) => (
            <span key={p.id}>
              {i > 0 && (i === used.length - 1 ? ' and ' : ', ')}
              <a href={`#${p.id}`}>{p.name}</a>
            </span>
          ))}
          .
        </>
      ) : dailyTools.includes(skill) ? (
        'Open every day, outside any one project.'
      ) : (
        'Not in a listed project yet.'
      )}
    </p>
  )
}

export default function Skills({ active, onPress }: Props) {
  const section = useRef<HTMLElement>(null)
  const photo = useRef<HTMLDivElement>(null)
  const grid = useRef<HTMLDivElement>(null)
  const hold = useRef<HTMLDivElement>(null)
  // Skips the scene to its end, so a keyboard never lands on a row not yet written.
  const finish = useRef<(() => void) | null>(null)
  const [near, setNear] = useState(false)
  const [entered, setEntered] = useState(false)
  const scroll = useRef<RackScroll>({ value: 0.5 })
  const wide = useMediaQuery('(min-width: 40.01rem)')
  const reduced = useReducedMotion()
  const theme = useTheme()

  // Load the rack only as the section comes near; it is never needed on phones.
  useEffect(() => {
    const el = section.current
    const pic = photo.current
    if (!el || !pic) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setNear(true)
        io.disconnect()
      }
    }, { rootMargin: '400px 0px' })
    io.observe(el)
    // The keys rise into the bed once most of the rack is on screen.
    const seen = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setEntered(true)
        seen.disconnect()
      }
    }, { threshold: 0.45 })
    seen.observe(pic)
    return () => { io.disconnect(); seen.disconnect() }
  }, [])

  // How far the section has travelled through the screen, 0 arriving to 1
  // leaving; the rack holds still in its column and its camera follows this.
  // Reduced motion keeps the middle view.
  useEffect(() => {
    const el = section.current
    if (!el || reduced || !near) return
    let frame = 0
    const update = () => {
      frame = 0
      const r = el.getBoundingClientRect()
      const p = (window.innerHeight - r.top) / (window.innerHeight + r.height)
      scroll.current.value = Math.min(1, Math.max(0, p))
      scroll.current.invalidate?.()
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
      scroll.current.value = 0.5
    }
  }, [reduced, near])

  // The arrival, on a wide screen with motion. While the section comes in,
  // the rack rises out of the dark and tilts from a flat plan toward the
  // viewer; then the whole stage holds for a screen while the list writes
  // itself in, group by group, and lets go into the still layout, which is
  // all that phones, reduced motion and no script ever see.
  useEffect(() => {
    const el = section.current
    if (!el) return
    let alive = true
    let revert = () => {}
    Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (!alive) return
      gsap.registerPlugin(ScrollTrigger)
      const mm = gsap.matchMedia()
      mm.add('(min-width: 40.01rem) and (prefers-reduced-motion: no-preference)', () => {
        el.classList.add('is-live')
        const q = gsap.utils.selector(el)
        // Coming in: from the grid's first edge on screen until it sticks.
        gsap.timeline({ scrollTrigger: { trigger: grid.current, start: 'top bottom', end: 'top 12%', scrub: 0.6 } })
          .fromTo(scroll.current, { rise: 0 }, { rise: 1, ease: 'power2.inOut', onUpdate: () => scroll.current.invalidate?.() }, 0)
          .from(q('.skillset__photo'), { yPercent: 18, opacity: 0, ease: 'power2.out' }, 0)
        // Held: the stage is stuck for the hold's height while the two groups
        // on its first screen write themselves in; the rest write in as they
        // come up after it lets go. ScrollTrigger measures the unstuck page,
        // where those groups sit a hold higher than they really arrive.
        const held = () => hold.current?.offsetHeight ?? innerHeight * 0.7
        const write = gsap.timeline({
          scrollTrigger: { trigger: grid.current, start: 'top 12%', end: () => `+=${held()}`, scrub: 0.6 },
        })
        const rows = (g: Element) => g.querySelectorAll('.skillset__label, .skillset__item')
        const ink = { opacity: 0, x: -16, clipPath: 'inset(0% 100% 0% 0%)', ease: 'power2.out', duration: 0.6, stagger: 0.12 }
        q('.skillset__group').forEach((g, i) => {
          if (i < 2) write.from(rows(g), ink, i)
          else gsap.from(rows(g), { ...ink, scrollTrigger: { trigger: g, start: () => `top+=${held()} bottom`, end: () => `top+=${held()} 60%`, scrub: 0.6 } })
        })
        finish.current = () => {
          const st = write.scrollTrigger
          if (st && st.progress < 1) st.scroll(st.end)
        }
        ScrollTrigger.refresh()
        return () => { el.classList.remove('is-live'); finish.current = null }
      })
      mm.add('(max-width: 40rem), (prefers-reduced-motion: reduce)', () => {
        el.classList.add('is-rest')
        return () => el.classList.remove('is-rest')
      })
      revert = () => mm.revert()
    })
    return () => { alive = false; revert() }
  }, [])

  // Up and down walk the rows, Home and End jump to either end; every row
  // also stays in the tab order.
  const walk = (e: KeyboardEvent<HTMLDivElement>) => {
    const rows = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('.skillset__key')]
    const i = rows.indexOf(document.activeElement as HTMLButtonElement)
    if (i < 0) return
    const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: rows.length - 1 }[e.key]
    if (to === undefined) return
    e.preventDefault()
    rows[Math.min(rows.length - 1, Math.max(0, to))].focus()
  }

  return (
    <section className="skillset scene" data-scene="rack-rises" id="skills" aria-labelledby="skills-title" ref={section}>
      <div className="container skillset__grid" ref={grid}>
        <div className="skillset__photo" ref={photo} aria-hidden="true">
          {near && wide && (
            <Suspense fallback={null}>
              <SkillRack active={active} reduced={reduced} entered={entered} theme={theme} scroll={scroll} onPress={onPress} />
            </Suspense>
          )}
        </div>

        <div className="skillset__side">
          <h2 id="skills-title" data-reveal="head">The stack, one key each.</h2>
          <p className="skillset__lead" data-reveal style={{ '--d': 150 } as CSSProperties}>Press one to see which project uses it.</p>

          <div className="skillset__groups" onKeyDown={walk} onFocus={() => finish.current?.()}>
            {skillGroups.map((g, gi) => (
              <div className="skillset__group" data-reveal style={{ '--d': 200 + gi * 90 } as CSSProperties} key={g.name}>
                <h3 className="skillset__label" id={`skills-${g.name}`}>{g.name}</h3>
                <ul className="skillset__list" aria-labelledby={`skills-${g.name}`}>
                  {g.skills.map((s) => {
                    const on = s === active
                    return (
                      <li className="skillset__item" data-on={on || undefined} key={s}>
                        <button
                          className="skillset__key"
                          type="button"
                          aria-pressed={on}
                          aria-describedby={on ? 'skills-used' : undefined}
                          onClick={() => onPress(s)}
                          onFocus={() => onPress(s)}
                          // A real move of the mouse, not the row sliding under a still pointer.
                          onPointerMove={(e) => { if (!on && e.pointerType === 'mouse' && (e.movementX || e.movementY)) onPress(s) }}
                        >
                          <span className="skillset__name">{s}</span>
                          <span className="skillset__count">{count(s)}</span>
                        </button>
                        {on && <Used skill={s} />}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="skillset__hold" ref={hold} aria-hidden="true" />
    </section>
  )
}
