import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
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

// The card's front: the app itself, live, under its name and what it is
// built with.
function FrontFace({ project, active, onPress }: { project: Project } & Press) {
  return (
    <div className="flip__face flip__face--front pile__card pile__card--screen">
      <div className="pile__inner">
        <header className="pile__head">
          <div className="pile__title">
            <h3 className="case__name" id={`${project.id}-name`}>{project.name}</h3>
            <p className="case__line">{project.line}</p>
            <a className="case__code" href={project.github} target="_blank" rel="noreferrer">Code on GitHub</a>
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
        </header>
        <div className="pile__screen"><Screen project={project} /></div>
        <div className="flip__shade" aria-hidden="true" />
      </div>
    </div>
  )
}

// The card's back: the same app drawn taken apart, its layers spread with a
// label on each, as in a technical drawing, and where the app has real
// hardware, den's render of it with the route a reading takes. The drawing's
// screen layer is a picture of the front's screen, so it is inert.
function BackFace({ project, active }: { project: Project; active: string }) {
  const { anatomy } = project
  const n = anatomy.layers.length
  const branchAt = anatomy.branch ? anatomy.layers.findIndex((l) => l.name === anatomy.branch!.from) : -1
  return (
    <div className="flip__face flip__face--back pile__card pile__card--apart" role="group" aria-labelledby={`${project.id}-apart`}>
      <div className="pile__inner">
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
          <div className="flip__hardware">
            <h4 className="flip__hardware-title">{anatomy.figure}</h4>
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
        <div className="flip__shade" aria-hidden="true" />
      </div>
    </div>
  )
}

// A project as one card with two faces. On a wide screen with motion it is a
// short scene on a held stage: the app sits framed under its name, then
// opens out until it fills the whole window, edge to edge; then the drawing
// of it taken apart rises over it from the bottom edge, like a blind, full
// screen too, and holds. The next project simply scrolls in after it.
// Elsewhere the two faces are two plain cards, front then back.
function ProjectCard({ project, active, onPress }: { project: Project } & Press) {
  const lit = project.uses.includes(active)
  return (
    <article className="flip scene" data-scene="flip" id={project.id} data-lit={lit} aria-labelledby={`${project.id}-name`} style={{ '--hold': 2.6 } as CSSProperties}>
      <div className="flip__stage">
        <div className="flip__tilt">
          <div className="flip__card">
            <FrontFace project={project} active={active} onPress={onPress} />
            <BackFace project={project} active={active} />
          </div>
        </div>
      </div>
    </article>
  )
}

const LIVE = '(min-width: 68.76rem) and (prefers-reduced-motion: no-preference)'
const REST = '(max-width: 68.75rem), (prefers-reduced-motion: reduce)'
const TURNED = 0.64 // the moment in the scene the drawing covers half the app

function useCardScenes(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current
    if (!el) return
    gsap.registerPlugin(ScrollTrigger)
    const ctx = gsap.context(() => {
      gsap.matchMedia().add({ live: LIVE, rest: REST }, (c) => {
        const scenes = gsap.utils.toArray<HTMLElement>('.flip.scene', el)
        if (!c.conditions?.live) {
          scenes.forEach((s) => s.classList.add('is-rest'))
          return () => scenes.forEach((s) => s.classList.remove('is-rest'))
        }
        const undo: (() => void)[] = []
        scenes.forEach((scene) => {
          scene.classList.add('is-live')
          const front = scene.querySelector<HTMLElement>('.flip__face--front')!
          const back = scene.querySelector<HTMLElement>('.flip__face--back')!
          const video = back.querySelector('video')
          let showing: 'front' | 'back' | null = null
          let seen: boolean | null = null
          // The face turned away is inert, so focus and its controls never
          // land on a side nobody can see; the render plays only face up.
          // Both change only when the state does, never on every frame.
          const face = (side: 'front' | 'back', inView: boolean) => {
            if (side === showing && inView === seen) return
            showing = side
            seen = inView
            front.inert = side === 'back'
            back.inert = side === 'front'
            if (video) { if (side === 'back' && inView) video.play().catch(() => {}); else video.pause() }
          }
          face('front', false)
          // Opening out: the screen is laid out full window and clipped to
          // its frame under the head; the clip opens to the window's edges
          // while the app inside slides from the frame's top to the window's.
          const head = front.querySelector<HTMLElement>('.pile__head')!
          const screen = front.querySelector<HTMLElement>('.pile__screen')!
          const app = screen.firstElementChild as HTMLElement
          // Full window, the app is set a little larger so it fills the
          // window's height: zoom reflows it, so it is measured twice.
          const fit = () => {
            app.style.zoom = '1'
            let z = Math.min(1.45, Math.max(1, innerHeight / app.getBoundingClientRect().height))
            app.style.zoom = String(z)
            z = Math.min(1.45, Math.max(1, z * innerHeight / app.getBoundingClientRect().height))
            app.style.zoom = String(z)
          }
          fit()
          ScrollTrigger.addEventListener('refreshInit', fit)
          undo.push(() => { ScrollTrigger.removeEventListener('refreshInit', fit); app.style.zoom = '' })
          const side = () => head.offsetLeft
          const top = () => head.offsetTop + head.offsetHeight + 40
          // The blind: the back face rises from below the window's bottom
          // edge while its contents move down by as much, so the drawing
          // stays put and is uncovered from the bottom up. Transforms only.
          const backInner = back.querySelector<HTMLElement>('.pile__inner')!
          const shade = front.querySelector<HTMLElement>('.flip__shade')!
          gsap.timeline({
            scrollTrigger: {
              trigger: scene, start: 'top top', end: 'bottom bottom', scrub: 0.4, invalidateOnRefresh: true,
              onUpdate: (st) => face(st.progress > TURNED ? 'back' : 'front', st.isActive),
              onToggle: (st) => face(st.progress > TURNED ? 'back' : 'front', st.isActive),
            },
          })
            .fromTo(screen, { clipPath: () => `inset(${top()}px ${side()}px ${side()}px ${side()}px)` }, { clipPath: 'inset(0px 0px 0px 0px)', duration: 0.32, ease: 'power3.inOut' }, 0.06)
            .fromTo(app, { y: () => top() / (parseFloat(app.style.zoom) || 1), force3D: true }, { y: 0, duration: 0.32, ease: 'power3.inOut' }, 0.06)
            .fromTo(head, { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -32, duration: 0.2, ease: 'power1.in' }, 0.12)
            .fromTo(back, { yPercent: 100, force3D: true }, { yPercent: 0, duration: 0.3, ease: 'power2.inOut' }, 0.5)
            .fromTo(backInner, { yPercent: -100, force3D: true }, { yPercent: 0, duration: 0.3, ease: 'power2.inOut' }, 0.5)
            .fromTo(shade, { opacity: 0 }, { opacity: 0.5, duration: 0.3, ease: 'none' }, 0.5)
            .to({}, { duration: 0.2 }, 0.8)
        })
        ScrollTrigger.refresh()
        return () => scenes.forEach((s) => {
          undo.splice(0).forEach((u) => u())
          s.classList.remove('is-live')
          s.querySelectorAll<HTMLElement>('.flip__face').forEach((f) => { f.inert = false })
        })
      })
    }, el)
    return () => ctx.revert()
  }, [root])
}

export default function Work({ active, onPress }: Press) {
  const ref = useRef<HTMLElement>(null)
  useCardScenes(ref)
  return (
    <section className="cases" id="work" aria-labelledby="work-title" ref={ref}>
      <div className="cases__intro">
        <h2 id="work-title" data-reveal="head">Two <span className="nowrap">full-stack</span> apps.</h2>
        <p data-reveal style={delay(150)}>A farm dashboard and a study planner, each with its own API.</p>
      </div>
      <div className="pile">
        {projects.map((p) => <ProjectCard project={p} active={active} onPress={onPress} key={p.id} />)}
      </div>
    </section>
  )
}
