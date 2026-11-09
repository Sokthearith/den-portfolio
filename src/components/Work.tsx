import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { projects, type Layer, type Project } from '../data/projects'
import { skillGroups } from '../data/skills'
import { LayerDrawing } from './WorkLayers'
import { FieldNodeView } from './WorkNode'
import { AgrixScreenView, PlanifyScreenView } from './WorkScreens'
import '../styles/work.css'

const keys = new Set(skillGroups.flatMap((g) => g.skills))
const delay = (ms: number) => ({ '--d': ms }) as CSSProperties

type Press = { active: string; onPress: (name: string) => void }

// A stack item that names a key on the rack presses it; the rest are words.
function StackItem({ item, active, onPress }: { item: string } & Press) {
  if (!keys.has(item)) return <li className="case__item">{item}</li>
  return (
    <li>
      <button className="case__key" type="button" aria-pressed={item === active} onClick={() => onPress(item)}>
        {item}
      </button>
    </li>
  )
}

// The leader from a callout to its layer's corner: a stroke of the drawing.
const Lead = () => (
  <svg className="xp__lead" viewBox="0 0 56 2" preserveAspectRatio="none" aria-hidden="true">
    <line x1="0" y1="1" x2="56" y2="1" vectorEffect="non-scaling-stroke" />
  </svg>
)

function Callout({ layer }: { layer: Layer }) {
  return (
    <div className="xp__callout">
      <Lead />
      <div className="xp__label">
        <p className="xp__title">{layer.name}</p>
        <p className="xp__fact">{layer.detail}</p>
      </div>
    </div>
  )
}

// One layer: a slab seen from above at an angle, its face drawn, its edge lit
// amber when it runs on the pressed key.
function Slab({ layer, project, children }: { layer: Layer; project: Project; children?: ReactNode }) {
  const screen = project.screen
  return (
    <div className="xp__seat">
      <div className="xp__slab">
        <div className="xp__side" aria-hidden="true" />
        <div className="xp__face" data-ui data-draw={layer.draw}>
          {children ?? <LayerDrawing draw={layer.draw} agrix={screen?.kind === 'agrix' ? screen : undefined} planify={screen?.kind === 'planify' ? screen : undefined} />}
        </div>
      </div>
    </div>
  )
}

function Screen({ project }: { project: Project }) {
  const { screen } = project
  if (screen?.kind === 'agrix') return <AgrixScreenView screen={screen} />
  if (screen?.kind === 'planify') return <PlanifyScreenView screen={screen} />
  return null
}


// The app taken apart: its layers spread with a label on each, as in a
// technical drawing, and where the app has real hardware, den's render of it
// with the route a reading takes. The drawing's screen layer is a picture of
// the app, so it is inert.
function Drawing({ project, active }: { project: Project; active: string }) {
  const { anatomy } = project
  const n = anatomy.layers.length
  const branchAt = anatomy.branch ? anatomy.layers.findIndex((l) => l.name === anatomy.branch!.from) : -1
  return (
    <div className="apart" role="group" aria-labelledby={`${project.id}-apart`}>
      <div className="xp" data-n={n} style={{ '--n': n } as CSSProperties}>
        <h4 className="xp__fig" id={`${project.id}-apart`}>{anatomy.figure}</h4>
        <p className="xp__caption">{anatomy.caption}</p>
        <ol className="xp__layers">
          {anatomy.layers.map((layer, i) => (
            <li className="xp__layer" key={layer.name} style={{ '--i': i } as CSSProperties} data-side={i <= branchAt || i % 2 ? 'left' : 'right'} data-lit={Boolean(layer.uses?.includes(active))}>
              {layer.draw === 'screen'
                ? <div className="xp__picture" inert aria-hidden="true"><Slab layer={layer} project={project}><Screen project={project} /></Slab></div>
                : <Slab layer={layer} project={project} />}
              <Callout layer={layer} />
            </li>
          ))}
        </ol>
        {anatomy.branch && (
          <div className="xp__branch" style={{ '--i': branchAt } as CSSProperties} data-lit={Boolean(anatomy.branch.uses?.includes(active))}>
            <svg className="xp__wire" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <line x1="0" y1="100" x2="100" y2="0" vectorEffect="non-scaling-stroke" />
            </svg>
            <Slab layer={anatomy.branch} project={project} />
            <div className="xp__label xp__label--branch">
              <p className="xp__title">{anatomy.branch.name}</p>
              <p className="xp__fact">{anatomy.branch.detail}, off the {anatomy.branch.from}</p>
            </div>
          </div>
        )}
      </div>
      {anatomy.node && (
        <div className="apart__hardware">
          <h4 className="apart__title">{anatomy.figure}</h4>
          <FieldNodeView node={anatomy.node} />
          {/* The way a reading goes, from the field up, each step lit like the layer it is. */}
          <div className="route">
            <p className="route__title">{anatomy.caption}</p>
            <ol className="route__steps">
              <li className="route__step">Field node</li>
              {[...anatomy.layers].reverse().map((l) => <li className="route__step" key={l.name} data-lit={Boolean(l.uses?.includes(active))}>{l.name}</li>)}
              {anatomy.branch && <li className="route__step route__step--branch" data-lit={Boolean(anatomy.branch.uses?.includes(active))}>{anatomy.branch.name}, off the {anatomy.branch.from}</li>}
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}

type View = 'app' | 'apart'
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

// One project, open: its name and what it is built with along the top, then
// the app itself, live, or (one press away) the same app taken apart. A
// native dialog, so focus stays inside it and Escape closes it. Without
// script the dialog is simply a section of the page, both views in turn.
function Viewer({ project, active, onPress, dialog, onClose }: { project: Project; dialog: (el: HTMLDialogElement | null) => void; onClose: () => void } & Press) {
  const [view, setView] = useState<View>('app')
  const id = project.id
  return (
    <dialog className="viewer" id={`${id}-view`} aria-labelledby={`${id}-title`} ref={dialog} data-lenis-prevent onClose={() => { setView('app'); onClose() }}>
      <div className="viewer__bar">
        <h3 className="viewer__name" id={`${id}-title`}>{project.name}</h3>
        <p className="viewer__line">{project.line}</p>
        <div className="viewer__seg" role="group" aria-label={`${project.name}, view`}>
          <button type="button" aria-pressed={view === 'app'} onClick={() => setView('app')}>The app</button>
          <button type="button" aria-pressed={view === 'apart'} onClick={() => setView('apart')}>Taken apart</button>
        </div>
        <a className="viewer__code" href={project.github} target="_blank" rel="noreferrer">Code on GitHub</a>
        <form method="dialog" className="viewer__closer"><button className="viewer__close" type="submit">Close</button></form>
      </div>
      <dl className="case__stack">
        {project.stack.map((row) => (
          <div className="case__stack-row" key={row.label}>
            <dt>{row.label}</dt>
            <dd>
              <ul className="case__items">
                {row.items.map((item) => <StackItem item={item} active={active} onPress={onPress} key={item} />)}
              </ul>
            </dd>
          </div>
        ))}
      </dl>
      <div className="viewer__body">
        <div className="viewer__panel viewer__panel--app" data-off={view !== 'app' || undefined} inert={view !== 'app'}>
          <div className="viewer__screen"><Screen project={project} /></div>
        </div>
        <div className="viewer__panel viewer__panel--apart" data-off={view !== 'apart' || undefined} inert={view !== 'apart'}>
          <Drawing project={project} active={active} />
        </div>
      </div>
    </dialog>
  )
}

// Work as an index: the two apps' names, set as large as the page allows,
// are the menu. Pointing at one floats its app beside the pointer; pressing
// it opens the app full screen, the picture travelling from where it floated
// to where it lands, with the drawing of it taken apart one press away.
export default function Work({ active, onPress }: Press) {
  const dialogs = useRef(new Map<string, HTMLDialogElement>())
  const peek = useRef<HTMLDivElement>(null)
  const opener = useRef<HTMLButtonElement | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [fine, setFine] = useState(false)

  useEffect(() => {
    setMounted(true)
    const mq = matchMedia('(hover: hover) and (pointer: fine)')
    const on = () => setFine(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  // The floating picture trails the pointer a little, so it feels carried.
  useEffect(() => {
    const el = peek.current
    if (!el || !fine) return
    let x = 0, y = 0, px = 0, py = 0, frame = 0
    const step = () => {
      px += (x - px) * 0.2; py += (y - py) * 0.2
      el.style.translate = `${px.toFixed(1)}px ${py.toFixed(1)}px`
      frame = Math.abs(x - px) + Math.abs(y - py) > 0.4 ? requestAnimationFrame(step) : 0
    }
    // Kept inside the window: it floats up and to the right of the pointer.
    const move = (e: PointerEvent) => {
      x = Math.min(e.clientX, innerWidth - el.offsetWidth - 44)
      y = Math.max(e.clientY, el.offsetHeight + 44)
      if (reduced()) { px = x; py = y; el.style.translate = `${x}px ${y}px`; return }
      if (!frame) frame = requestAnimationFrame(step)
    }
    addEventListener('pointermove', move, { passive: true })
    return () => { removeEventListener('pointermove', move); cancelAnimationFrame(frame) }
  }, [fine])

  const open = useCallback((p: Project, e: MouseEvent<HTMLButtonElement>) => {
    const dialog = dialogs.current.get(p.id)
    if (!dialog) return
    opener.current = e.currentTarget
    const floating = peek.current?.dataset.on === 'true' ? peek.current.querySelector<HTMLElement>(`[data-for="${p.id}"]`) : null
    const from = (floating ?? e.currentTarget.querySelector<HTMLElement>('.index__name'))!.getBoundingClientRect()
    setHover(null)
    document.documentElement.classList.add('is-viewing')
    dialog.showModal()
    if (reduced()) return
    dialog.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' })
    // The app travels from the floating picture (or the name) into its frame.
    const screen = dialog.querySelector<HTMLElement>('.viewer__screen')!
    const to = screen.getBoundingClientRect()
    const sx = from.width / to.width
    screen.animate([
      { transformOrigin: '0 0', transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${sx})`, clipPath: `inset(0 0 ${Math.max(0, to.height - from.height / sx)}px 0)` },
      { transformOrigin: '0 0', transform: 'none', clipPath: 'inset(0 0 0 0)' },
    ], { duration: 620, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' })
  }, [])

  const closed = useCallback(() => {
    document.documentElement.classList.remove('is-viewing')
    opener.current?.focus()
  }, [])

  return (
    <section className="cases" id="work" aria-labelledby="work-title">
      <div className="cases__intro">
        <h2 id="work-title" data-reveal="head">Two <span className="nowrap">full-stack</span> apps.</h2>
        <p data-reveal style={delay(150)}>A farm dashboard and a study planner, each with its own API.</p>
      </div>

      <ul className="index">
        {projects.map((p, i) => (
          <li className="index__row" id={p.id} key={p.id} data-lit={p.uses.includes(active)} data-reveal style={delay(i * 90)}>
            <h3 className="index__head">
              <button
                className="index__open"
                type="button"
                aria-haspopup="dialog"
                aria-controls={`${p.id}-view`}
                onClick={(e) => open(p, e)}
                onPointerEnter={() => fine && setHover(p.id)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(null)}
              >
                <span className="index__name">{p.name}</span>
                <span className="index__line">{p.line}</span>
              </button>
            </h3>
          </li>
        ))}
      </ul>

      {/* The app beside the pointer: a live copy, small and inert. */}
      {mounted && fine && (
        <div className="peek" ref={peek} data-on={hover !== null} aria-hidden="true" inert>
          {projects.map((p) => (
            <div className="peek__screen" data-for={p.id} data-shown={hover === p.id || undefined} key={p.id}>
              <Screen project={p} />
            </div>
          ))}
        </div>
      )}

      {projects.map((p) => (
        <Viewer
          project={p}
          active={active}
          onPress={onPress}
          key={p.id}
          dialog={(el) => { if (el) dialogs.current.set(p.id, el); else dialogs.current.delete(p.id) }}
          onClose={closed}
        />
      ))}
    </section>
  )
}
