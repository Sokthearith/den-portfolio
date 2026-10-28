import Hero from './components/Hero'
import Nav from './components/Nav'

export default function App() {
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <Nav />
      <main id="main">
        <Hero />
      </main>
    </>
  )
}
