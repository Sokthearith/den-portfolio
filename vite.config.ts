import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

// Locally, /api/* runs the same functions Vercel runs in production (api/*.ts,
// which Node loads directly), with keys from .env.local. Each request goes to
// the export named for its method, as on Vercel.
function api(): Plugin {
  const handle = async (req: IncomingMessage, res: ServerResponse, next: (e?: unknown) => void) => {
    const name = req.url?.match(/^\/api\/([\w-]+)/)?.[1]
    if (!name) return next()
    try {
      const file = pathToFileURL(resolve('api', `${name}.ts`)).href
      const mod = await import(`${file}?t=${Date.now()}`)
      const method = req.method ?? 'GET'
      if (typeof mod[method] !== 'function') {
        res.statusCode = 405
        return res.end()
      }
      const headers = new Headers()
      for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
      headers.set('x-real-ip', req.socket.remoteAddress ?? 'local')
      const chunks: Buffer[] = []
      if (method !== 'GET' && method !== 'HEAD') for await (const c of req) chunks.push(c as Buffer)
      const out: Response = await mod[method](new Request(new URL(req.url!, `http://${req.headers.host ?? 'localhost'}`), {
        method,
        headers,
        body: chunks.length ? Buffer.concat(chunks) : undefined,
      }))
      res.statusCode = out.status
      out.headers.forEach((v, k) => res.setHeader(k, v))
      res.end(Buffer.from(await out.arrayBuffer()))
    } catch (e) {
      next(e)
    }
  }
  return {
    name: 'den-api',
    configureServer(server) {
      Object.assign(process.env, loadEnv('development', process.cwd(), ''))
      server.middlewares.use(handle)
    },
    configurePreviewServer(server) {
      Object.assign(process.env, loadEnv('production', process.cwd(), ''))
      server.middlewares.use(handle)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), api()],
})
