import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
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

// The first card: the app itself, live, under its name and what it is built with.
function ScreenCard({ project, active, onPress, index }: { project: Project; index: number } & Press) {
  const lit = project.uses.includes(active)
  return (
    <article className="pile__card pile__card--screen" id={project.id} data-lit={lit} aria-labelledby={`${project.id}-name`} style={{ '--c': index } as CSSProperties}>
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
        <div className="pile__shade" aria-hidden="true" />
      </div>
    </article>
  )
}

// The second card: the same app drawn taken apart, its layers spread with a
// label on each, as in a technical drawing. Its screen layer is a picture of
// the first card's screen, so it is inert.
function ApartCard({ project, active, index }: { project: Project; active: string; index: number }) {
  const { anatomy } = project
  const n = anatomy.layers.length
  const branchAt = anatomy.branch ? anatomy.layers.findIndex((l) => l.name === anatomy.branch!.from) : -1
  return (
    <section className="pile__card pile__card--apart" aria-labelledby={`${project.id}-apart`} style={{ '--c': index } as CSSProperties}>
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
        <div className="pile__shade" aria-hidden="true" />
      </div>
    </section>
  )
}

// The deck: on a wide screen each card holds near the top while the next
// slides up over it, and the one beneath steps back a little and darkens, so
// the cards pile up with their top edges showing. Only transform and opacity
// move. Reduced motion keeps the pile without the step back; narrow screens
// simply list the cards.
const PILE = '(min-width: 68.76rem) and (prefers-reduced-motion: no-preference)'

function useDeck(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current
    if (!el) return
    gsap.registerPlugin(ScrollTrigger)
    const ctx = gsap.context(() => {
      gsap.matchMedia().add(PILE, () => {
        const cards = gsap.utils.toArray<HTMLElement>('.pile__card', el)
        cards.slice(0, -1).forEach((card, i) => {
          const next = cards[i + 1]
          // The card stays opaque; a shade inside it darkens, so nothing
          // beneath ever shows through.
          gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: next, start: 'top bottom', end: () => `top ${parseFloat(getComputedStyle(next).top)}px`, scrub: true, invalidateOnRefresh: true } })
            .to(card.querySelector('.pile__inner'), { scale: 0.94, force3D: true }, 0)
            .to(card.querySelector('.pile__shade'), { opacity: 0.6 }, 0)
        })
      })
    }, el)
    return () => ctx.revert()
  }, [root])
}

export default function Work({ active, onPress }: Press) {
  const ref = useRef<HTMLElement>(null)
  useDeck(ref)
  return (
    <section className="cases" id="work" aria-labelledby="work-title" ref={ref}>
      <div className="cases__intro">
        <h2 id="work-title" data-reveal="head">Two full-stack apps.</h2>
        <p data-reveal style={delay(150)}>A farm dashboard and a study planner, each with its own API.</p>
      </div>
      <div className="pile">
        {projects.flatMap((p, i) => [
          <ScreenCard project={p} active={active} onPress={onPress} index={i * 2} key={`${p.id}-screen`} />,
          <ApartCard project={p} active={active} index={i * 2 + 1} key={`${p.id}-apart`} />,
        ])}
      </div>
    </section>
  )
}
