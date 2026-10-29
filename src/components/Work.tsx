import { useEffect, useRef, type CSSProperties } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { projects, type Layer, type Project } from '../data/projects'
import { skillGroups } from '../data/skills'
import { LayerDrawing } from './WorkLayers'
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
function Slab({ layer, project, children }: { layer: Layer; project: Project; children?: React.ReactNode }) {
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

// The app taken apart: its screen on top and the layers a reading or a plan
// passes through beneath, spread as the plate holds and closed again before
// it leaves. Without motion (and before any script) it rests spread open.
function Case({ project, active, onPress }: { project: Project } & Press) {
  const lit = project.uses.includes(active)
  const { anatomy, screen } = project
  const n = anatomy.layers.length
  const branchAt = anatomy.branch ? anatomy.layers.findIndex((l) => l.name === anatomy.branch!.from) : -1
  return (
    <>
      <article className="case scene" data-scene="exploded" id={project.id} data-lit={lit} aria-labelledby={`${project.id}-name`} style={{ '--hold': 2 } as CSSProperties}>
        <div className="xp" data-n={n} style={{ '--n': n } as CSSProperties}>
          <p className="xp__fig">{anatomy.figure}</p>
          <p className="xp__caption">{anatomy.caption}</p>

          <ol className="xp__layers">
            {anatomy.layers.map((layer, i) => (
              <li className="xp__layer" key={layer.name} style={{ '--i': i } as CSSProperties} data-side={i <= branchAt || i % 2 ? 'left' : 'right'} data-lit={Boolean(layer.uses?.includes(active))}>
                <Slab layer={layer} project={project}>
                  {layer.draw !== 'screen' ? undefined : screen?.kind === 'agrix' ? <AgrixScreenView screen={screen} /> : screen?.kind === 'planify' ? <PlanifyScreenView screen={screen} /> : undefined}
                </Slab>
                <Callout layer={layer} />
              </li>
            ))}
          </ol>

          {anatomy.branch && (
            <div className="xp__branch" style={{ '--i': branchAt } as CSSProperties} data-lit={Boolean(anatomy.branch.uses?.includes(active))}>
              <svg className="xp__wire" viewBox="0 0 100 2" preserveAspectRatio="none" aria-hidden="true">
                <line x1="0" y1="1" x2="100" y2="1" vectorEffect="non-scaling-stroke" />
              </svg>
              <Slab layer={anatomy.branch} project={project} />
              <div className="xp__label xp__label--branch">
                <p className="xp__title">{anatomy.branch.name}</p>
                <p className="xp__fact">{anatomy.branch.detail}, off the {anatomy.branch.from}</p>
              </div>
            </div>
          )}

          <div className="case__row">
            <h3 className="case__name" id={`${project.id}-name`}>{project.name}</h3>
            <p className="case__line">{project.line}</p>
            <a className="case__code" href={project.github} target="_blank" rel="noreferrer">Code on GitHub</a>
          </div>
        </div>
      </article>

      <div className="case__more">
        <dl className="case__stack" data-reveal style={delay(120)}>
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
      </div>
    </>
  )
}

// The scene: on a wide screen with motion allowed, each plate holds for two
// screens while it tilts from its flat screen into the drawing, comes apart,
// shows its labels, closes and lies flat again. Everywhere else it rests open.
// GSAP moves each slab's own transform (the drawing's angle is rotate 30,
// skew -30, squash 0.864), so a frame only recomposites the slabs and never
// restyles the screens inside them.
const LIVE = '(min-width: 68.76rem) and (prefers-reduced-motion: no-preference)'
const REST = '(max-width: 68.75rem), (prefers-reduced-motion: reduce)'

function useExplodedScenes(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current
    if (!el) return
    gsap.registerPlugin(ScrollTrigger)
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()
      mm.add({ live: LIVE, rest: REST }, (c) => {
        const cases = gsap.utils.toArray<HTMLElement>('.case.scene', el)
        if (!c.conditions?.live) {
          cases.forEach((s) => s.classList.add('is-rest'))
          return () => cases.forEach((s) => s.classList.remove('is-rest'))
        }
        cases.forEach((section) => {
          const stage = section.querySelector<HTMLElement>('.xp')
          if (!stage) return
          section.classList.add('is-live')
          const slabs = gsap.utils.toArray<HTMLElement>('.xp__layer > .xp__seat > .xp__slab', stage)
          const sides = stage.querySelectorAll('.xp__layer .xp__side')
          const labels = stage.querySelectorAll('.xp__callout, .xp__branch')
          const n = slabs.length
          // Read the stage's own numbers each refresh, so a resize re-fits it.
          const num = (name: string) => parseFloat(getComputedStyle(stage).getPropertyValue(name))
          const gap = () => Math.min(150, (window.innerHeight - 220 - 950 * num('--s')) / (n - 1))
          const flat = { rotation: 0, skewX: 0, scaleX: () => num('--sf'), scaleY: () => num('--sf'), y: 0 }
          const drawn = { rotation: 30, skewX: -30, scaleX: () => num('--s'), scaleY: () => num('--s') * 0.864 }
          // The slabs' starting state lives in the timeline (fromTo), so a
          // refresh, which reverts and replays it, lands back on it; the labels
          // and edges start hidden in CSS while the scene is live.
          gsap.timeline({ defaults: { ease: 'power2.inOut' }, scrollTrigger: { trigger: section, start: 'top top', end: 'bottom bottom', scrub: 0.5, invalidateOnRefresh: true } })
            .fromTo(slabs, { xPercent: -50, yPercent: -50, skewType: 'simple', force3D: true, ...flat }, { ...drawn, duration: 0.15 }, 0.08)
            .to(sides, { autoAlpha: 1, duration: 0.1, ease: 'none' }, 0.13)
            .to(slabs, { y: (i: number) => (i - (n - 1) / 2) * gap(), duration: 0.2 }, 0.24)
            .fromTo(labels, { x: -12 }, { autoAlpha: 1, x: 0, duration: 0.07, stagger: 0.025, ease: 'power1.out' }, 0.36)
            .to(labels, { autoAlpha: 0, duration: 0.04, ease: 'none' }, 0.6)
            .to(slabs, { y: 0, duration: 0.16 }, 0.62)
            .to(sides, { autoAlpha: 0, duration: 0.08, ease: 'none' }, 0.8)
            .to(slabs, { ...flat, duration: 0.12 }, 0.8)
            .to({}, { duration: 0.08 }, 0.92)
        })
        ScrollTrigger.refresh()
        return () => cases.forEach((s) => s.classList.remove('is-live'))
      })
    }, el)
    return () => ctx.revert()
  }, [root])
}

export default function Work({ active, onPress }: Press) {
  const ref = useRef<HTMLElement>(null)
  useExplodedScenes(ref)
  return (
    <section className="cases" id="work" aria-labelledby="work-title" ref={ref}>
      <div className="cases__intro">
        <h2 id="work-title" data-reveal="head">Two full-stack apps.</h2>
        <p data-reveal style={delay(150)}>A farm dashboard and a study planner, each with its own API.</p>
      </div>
      {projects.map((p) => <Case project={p} active={active} onPress={onPress} key={p.id} />)}
    </section>
  )
}
