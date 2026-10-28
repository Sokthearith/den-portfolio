import Footer from './components/Footer'
import Nav from './components/Nav'
import Palette from './components/Palette'
import { useReveal } from './lib/reveal'
import { findRoute } from './routes'

// The shell every page shares: skip link, nav, the page, the footer, and the
// Ctrl+K palette.
export default function App({ path }: { path: string }) {
  const { page: Page } = findRoute(path)
  useReveal()

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <Nav />
      <main id="main">
        <Page />
      </main>
      <Footer />
      <Palette />
    </>
  )
}
