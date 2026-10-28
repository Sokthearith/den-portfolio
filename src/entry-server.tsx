import { renderToString } from 'react-dom/server'
import App from './App'
import type { NowSeed } from './lib/now'
import { routes } from './routes'

export { routes }

export function render(path: string, seed: NowSeed) {
  return renderToString(<App path={path} seed={seed} />)
}
