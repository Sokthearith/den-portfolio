import { useEffect } from 'react'

// The night passing: how far down the page the visitor is, as an hour from
// 10 p.m. at the top (0) to first light at the bottom (1). It is written to
// --hour on the page root, with a coarse data-hour for whole-section changes,
// so the sky and any section can follow it in CSS without re-rendering React.
// It also starts the page's one smooth scroll, weighted, for wheels only.
export function usePassage() {
  useEffect(() => {
    const root = document.documentElement
    let frame = 0
    const update = () => {
      frame = 0
      const span = Math.max(1, root.scrollHeight - window.innerHeight)
      const hour = Math.min(1, Math.max(0, window.scrollY / span))
      root.style.setProperty('--hour', hour.toFixed(4))
      root.dataset.hour = hour < 0.34 ? 'late' : hour < 0.8 ? 'small-hours' : 'first-light'
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
