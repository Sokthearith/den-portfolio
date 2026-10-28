import { marked } from 'marked'

// Notes are Markdown files in src/content/notes, each with a small header:
//   title, summary, date (YYYY-MM-DD), status (draft | published), tags.
// Drafts show only while developing (npm run dev); the live site builds just
// the published ones.

export type Note = { slug: string; title: string; summary: string; date: string; status: 'draft' | 'published'; tags: string[]; html: string; minutes: number }

const files = import.meta.glob('../content/notes/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

function parse(path: string, raw: string): Note {
  const slug = path.split('/').pop()!.replace(/\.md$/, '')
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  const head: Record<string, string> = {}
  ;(m?.[1] ?? '').split('\n').forEach((line) => {
    const i = line.indexOf(':')
    if (i > 0) head[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  })
  // Comments are notes to the writer, never to the reader.
  const body = (m?.[2] ?? raw).replace(/<!--[\s\S]*?-->/g, '').trim()
  const words = body.split(/\s+/).filter(Boolean).length
  return {
    slug,
    title: head.title ?? slug,
    summary: head.summary ?? '',
    date: head.date ?? '',
    status: head.status === 'published' ? 'published' : 'draft',
    tags: (head.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean),
    html: marked.parse(body, { async: false }) as string,
    minutes: Math.max(1, Math.round(words / 220)),
  }
}

export const notes: Note[] = Object.entries(files)
  .map(([path, raw]) => parse(path, raw))
  .filter((n) => n.status === 'published' || import.meta.env.DEV)
  .sort((a, b) => b.date.localeCompare(a.date))

export const published = notes.filter((n) => n.status === 'published')

export const noteDate = (iso: string) =>
  iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : ''
