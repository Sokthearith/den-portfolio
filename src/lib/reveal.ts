import { useEffect } from 'react'

// One reveal for the whole page: anything marked data-reveal gets .is-in the
// first time it comes into view. The CSS keeps everything visible without
// script and under reduced motion, so nothing depends on this running.
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
    document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}
