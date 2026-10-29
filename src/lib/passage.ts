import { useEffect } from 'react'

// The night passing: how far down the page the visitor is, as an hour from
// 10 p.m. at the top (0) to first light at the bottom (1). Scrolling must stay
// cheap, so the hour never goes on the page root (that would restyle the whole
// page every frame): the sky's two later hours are cross-faded by opacity, the
// only other readers (the cinema) get --hour on themselves, and the coarse
// data-hour on <html> changes only when the hour crosses a boundary.
// It also starts the page's one smooth scroll, weighted, for wheels only.
export function usePassage() {
  useEffect(() => {
    const root = document.documentElement
    const sky = document.querySelector<HTMLElement>('.sky')
    let frame = 0
    let last = -1
    const update = () => {
      frame = 0
      const span = Math.max(1, root.scrollHeight - window.innerHeight)
      const hour = Math.min(1, Math.max(0, window.scrollY / span))
      if (Math.abs(hour - last) < 0.0015) return
      last = hour
      sky?.style.setProperty('--first', Math.min(1, hour * 2).toFixed(3))
      sky?.style.setProperty('--second', Math.max(0, hour * 2 - 1).toFixed(3))
      document.querySelectorAll<HTMLElement>('.cinema').forEach((el) => el.style.setProperty('--hour', hour.toFixed(3)))
      const name = hour < 0.34 ? 'late' : hour < 0.8 ? 'small-hours' : 'first-light'
      if (root.dataset.hour !== name) root.dataset.hour = name
    }
    const queue = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', queue, { passive: true })
    window.addEventListener('resize', queue)

    // Weighted wheel scrolling (references/scenes.md): never for touch or
    // reduced motion, and wired to ScrollTrigger so the scenes stay in step.
    let alive = true
    let smooth = () => {}
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches || matchMedia('(pointer: coarse)').matches
    if (!still) {
      Promise.all([import('lenis'), import('gsap'), import('gsap/ScrollTrigger')]).then(([{ default: Lenis }, { gsap }, { ScrollTrigger }]) => {
        if (!alive) return
        gsap.registerPlugin(ScrollTrigger)
        const lenis = new Lenis({ lerp: 0.12, smoothWheel: true, anchors: true, autoRaf: false })
        lenis.on('scroll', ScrollTrigger.update)
        const tick = (t: number) => lenis.raf(t * 1000)
        gsap.ticker.add(tick)
        gsap.ticker.lagSmoothing(0)
        root.classList.add('is-smooth')
        smooth = () => { gsap.ticker.remove(tick); lenis.destroy(); root.classList.remove('is-smooth') }
      })
    }

    return () => {
      alive = false
      window.removeEventListener('scroll', queue)
      window.removeEventListener('resize', queue)
      cancelAnimationFrame(frame)
      smooth()
    }
  }, [])
}
