import { useEffect } from 'react'

// One reveal for the whole page: anything marked data-reveal gets .is-in the
// first time it comes into view, including parts that arrive later (the song
// from Spotify). The CSS keeps everything visible without script and under
// reduced motion, so nothing depends on this running.
export function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return
        e.target.classList.add('is-in')
        io.unobserve(e.target)
      }),
      { rootMargin: '0px 0px -12% 0px' },
    )
    const watch = (root: ParentNode) => root.querySelectorAll('[data-reveal]:not(.is-in)').forEach((el) => io.observe(el))
    watch(document)
    const mo = new MutationObserver((records) => records.forEach((r) => r.addedNodes.forEach((n) => {
      if (!(n instanceof Element)) return
      if (n.matches('[data-reveal]:not(.is-in)')) io.observe(n)
      watch(n)
    })))
    mo.observe(document.body, { childList: true, subtree: true })
    return () => { io.disconnect(); mo.disconnect() }
  }, [])
}
