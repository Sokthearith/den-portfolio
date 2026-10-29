import { createElement, type ComponentType } from 'react'
import { notes } from './lib/notes'
import Algorithms from './pages/Algorithms'
import Home from './pages/Home'
import Lab from './pages/Lab'
import Note from './pages/Note'
import Notes from './pages/Notes'
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
    path: '/algorithms',
    file: 'algorithms/index.html',
    title: 'Algorithms, by lamplight, den',
    description: 'Data structures and algorithms visualized step by step: sorting, stacks and queues, trees, graphs and pathfinding, by Kheng Sokthearith (den).',
    page: Algorithms,
  },
  {
    path: '/lab',
    file: 'lab/index.html',
    title: 'The lab, den',
    description: 'Small experiments from den\'s site: the night by hand, type that leans in, and the skills rack off its stand.',
    page: Lab,
  },
  // The notes page exists once there is a note on it; until then /notes is dark.
  ...(notes.length === 0 ? [] : [{
    path: '/notes',
    file: 'notes/index.html',
    title: 'Notes after midnight, den',
    description: 'Notes on history and philosophy by Kheng Sokthearith (den).',
    page: Notes,
  }]),
  ...notes.map((n) => ({
    path: `/notes/${n.slug}`,
    file: `notes/${n.slug}/index.html`,
    title: `${n.title}, den`,
    description: n.summary || 'A note by den.',
    page: () => createElement(Note, { note: n }),
  })),
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
