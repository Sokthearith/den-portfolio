import { useEffect } from 'react'

// The curtain: the page's one transition between sections. At each boundary
// the section below waits in place while the one above lifts up and off it,
// uncovering it from the bottom edge up. Over the outgoing section's last
// screen the incoming one is held still (a linear translate that cancels the
// scroll) and clipped to what lies below the outgoing section's bottom edge.
// It runs before the incoming section's own scenes start (they hold when its
// top reaches the top of the screen, which is where the curtain ends), never
// on the hero's exit (the hero opens into the sky by itself), and not at all
// under reduced motion, where every section simply scrolls.
//
// It needs the section above to fill the screen while it lifts, so it runs
// only on the home page, and only where both sections are at least a screen
// tall; short sections in a row (the lab's benches) would each be lifting and
// uncovered at once, and jump. Those pages keep their own arrivals.
export function useCurtain(path: string) {
  useEffect(() => {
    if (path !== '/' || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let alive = true
    let undo = () => {}
    Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (!alive) return
      gsap.registerPlugin(ScrollTrigger)
      const main = document.getElementById('main')
      const footer = document.querySelector<HTMLElement>('#main ~ footer')
      if (!main) return
      const parts = [...main.children, footer].filter((el): el is HTMLElement => el instanceof HTMLElement && el.offsetHeight > 0)
      const ctx = gsap.context(() => {
        parts.forEach((below, i) => {
          const above = parts[i - 1]
          if (!above || above.matches('.hero')) return
          if (above.offsetHeight < window.innerHeight || below.offsetHeight < window.innerHeight) return
          const h = () => window.innerHeight
          const lift = gsap.fromTo(below,
            { y: () => -h(), clipPath: () => `inset(${h()}px 0px 0px 0px)` },
            { y: 0, clipPath: 'inset(0px 0px 0px 0px)', ease: 'none', force3D: true, paused: true })
          // The curtain only lifts. Scrolling back up it holds where it is,
          // and at any hold the section below shows from the upper one's
          // bottom edge, so both simply scroll; going down again it waits
          // for the scroll to catch up before it moves. Once the seam is
          // back below the screen it is let down again, out of sight.
          // Measured on the section above, which never moves, so the trigger's
          // own numbers are never thrown off by the transform it drives.
          let t = 0
          const to = (p: number) => { t = p; lift.progress(p) }
          ScrollTrigger.create({
            trigger: above, start: 'bottom bottom', end: 'bottom top',
            onUpdate: (self) => { if (self.direction > 0 && self.progress > t) to(self.progress) },
            onLeaveBack: () => to(0),
            onRefresh: (self) => { lift.invalidate(); to(self.progress && Math.max(t, self.progress)) },
          })
        })
      })
      ScrollTrigger.refresh()
      undo = () => ctx.revert()
    })
    return () => { alive = false; undo() }
  }, [path])
}
