import Footer from './components/Footer'
import Nav from './components/Nav'
import Palette from './components/Palette'
import { useReveal } from './lib/reveal'
import { NowProvider, type NowSeed } from './lib/now'
import { findRoute } from './routes'

// The shell every page shares: skip link, nav, the page, the footer, and the
// Ctrl+K palette.
export default function App({ path, seed = { films: [] } }: { path: string; seed?: NowSeed }) {
  const { page: Page } = findRoute(path)
  useReveal()

  return (
    <NowProvider seed={seed}>
      <a className="skip" href="#main">Skip to content</a>
      <Nav home={findRoute(path).path === '/'} />
      <main id="main">
        <Page />
      </main>
      <Footer />
      <Palette />
    </NowProvider>
  )
}
