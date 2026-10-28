// Renders the app to HTML at build time and writes it into dist/index.html,
// so the page reads with scripting off and paints before the bundle loads.
import { readFile, writeFile, rm } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const dist = resolve('dist')
const { render } = await import(pathToFileURL(resolve('dist-ssr/entry-server.js')).href)
const html = await readFile(resolve(dist, 'index.html'), 'utf8')
await writeFile(resolve(dist, 'index.html'), html.replace('<div id="root"></div>', `<div id="root">${render()}</div>`))
await rm(resolve('dist-ssr'), { recursive: true, force: true })
console.log('prerendered dist/index.html')
