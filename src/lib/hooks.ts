import { useSyncExternalStore } from 'react'

// A media query as state; false on the server and in the prerendered HTML.
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (on) => {
      const mq = matchMedia(query)
      mq.addEventListener('change', on)
      return () => mq.removeEventListener('change', on)
    },
    () => matchMedia(query).matches,
    () => false,
  )
}

export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)')
