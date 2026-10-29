import Footer from './components/Footer'
import Nav from './components/Nav'
import Palette from './components/Palette'
import { useCurtain } from './lib/curtain'
import { usePassage } from './lib/passage'
import { useReveal } from './lib/reveal'
import { NowProvider, type NowSeed } from './lib/now'
import { findRoute } from './routes'

// The shell every page shares: the sky the night passes in, the curtain
// between sections, skip link, nav, the page, the footer, and the Ctrl+K palette.
export default function App({ path, seed = { films: [] } }: { path: string; seed?: NowSeed }) {
  const route = findRoute(path)
  const { page: Page } = route
  useReveal()
  usePassage()
  useCurtain(route.path)

  return (
    <NowProvider seed={seed}>
      <div className="sky" aria-hidden="true" />
      <a className="skip" href="#main">Skip to content</a>
      <Nav home={route.path === '/'} />
      <main id="main">
        <Page />
      </main>
      <Footer />
      <Palette />
    </NowProvider>
  )
}
