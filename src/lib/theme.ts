import { useSyncExternalStore } from 'react'

// Night is the site; dawn is a visitor's choice, kept in localStorage. The
// attribute is set before paint by a line in index.html, so there is no flash.
export type Theme = 'night' | 'dawn'

const KEY = 'theme'
const listeners = new Set<() => void>()

const read = (): Theme => (document.documentElement.dataset.theme === 'dawn' ? 'dawn' : 'night')

export function setTheme(theme: Theme) {
  if (theme === 'dawn') document.documentElement.dataset.theme = 'dawn'
  else delete document.documentElement.dataset.theme
  try { localStorage.setItem(KEY, theme) } catch { /* private mode: the choice lasts this visit */ }
  listeners.forEach((l) => l())
}

export const toggleTheme = () => setTheme(read() === 'dawn' ? 'night' : 'dawn')

export const useTheme = () =>
  useSyncExternalStore(
    (on) => { listeners.add(on); return () => listeners.delete(on) },
    read,
    (): Theme => 'night',
  )
