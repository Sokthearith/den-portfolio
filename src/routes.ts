import type { ComponentType } from 'react'
import Home from './pages/Home'
import NotFound from './pages/NotFound'

// Every page of the site. The build prerenders each to its own HTML file
// (see scripts/prerender.mjs); `file` is where it lands in dist/.
export type Route = { path: string; file: string; title: string; description: string; page: ComponentType }

export const routes: Route[] = [
  {
    path: '/',
    file: 'index.html',
    title: 'den, full-stack developer',
    description: 'Kheng Sokthearith (den), full-stack developer and software engineering student at CADT. Projects, skills and how to reach me.',
    page: Home,
  },
  {
    path: '/404',
    file: '404.html',
    title: 'This page is dark',
    description: 'Nothing lives at this address.',
    page: NotFound,
  },
]

const clean = (path: string) => (path.length > 1 ? path.replace(/\/+$/, '') : path)

export const findRoute = (path: string) =>
  routes.find((r) => r.path === clean(path)) ?? routes.find((r) => r.path === '/404')!
