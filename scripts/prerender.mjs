// Renders every route to HTML at build time and writes each to its own file
// in dist/, so every page reads with scripting off and paints before the
// bundle loads. The 404 lands at dist/404.html, which the host serves for
// any address it has no file for.
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'

const dist = resolve('dist')
const { render, routes } = await import(pathToFileURL(resolve('dist-ssr/entry-server.js')).href)
const shell = await readFile(resolve(dist, 'index.html'), 'utf8')
// The latest films, fetched once per build so they are in the HTML; if
// Letterboxd is unreachable the page builds without them and the browser asks.
const { fetchFilms } = await import(pathToFileURL(resolve('api/films.ts')).href)
const films = await fetchFilms(6).catch((e) => { console.warn(`films skipped: ${e.message}`); return [] })
const seed = { films }
const seedTag = `<script id="now-seed" type="application/json">${JSON.stringify(seed).replace(/</g, '\\u003c')}</script>`

const attr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

// Replacements go in as functions, so a `$$` or `$'` in a note or a film title
// stays text instead of being read as a replace pattern.
for (const route of routes) {
  const html = shell
    .replace(/<title>.*?<\/title>/, () => `<title>${attr(route.title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, (_, a, b) => `${a}${attr(route.description)}${b}`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, (_, a, b) => `${a}${attr(route.title)}${b}`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, (_, a, b) => `${a}${attr(route.description)}${b}`)
    .replace(/(<meta property="og:url" content="https:\/\/[^/"]+)\/[^"]*(")/, (_, a, b) => `${a}${route.path}${b}`)
    .replace('<div id="root"></div>', () => `<div id="root" data-route="${route.path}">${render(route.path, seed)}</div>${seedTag}`)
  const out = resolve(dist, route.file)
  await mkdir(dirname(out), { recursive: true })
  await writeFile(out, html)
  console.log(`prerendered ${route.path} -> dist/${route.file}`)
}
await rm(resolve('dist-ssr'), { recursive: true, force: true })
