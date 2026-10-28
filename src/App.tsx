import { useState } from 'react'
import About from './components/About'
import Footer from './components/Footer'
import Hero from './components/Hero'
import Nav from './components/Nav'
import Skills from './components/Skills'
import Work from './components/Work'
import { defaultSkill } from './data/skills'
import { useReveal } from './lib/reveal'

export default function App() {
  // The pressed key on the rack; Work lights the projects that use it.
  const [active, setActive] = useState(defaultSkill)
  useReveal()

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <Nav />
      <main id="main">
        <Hero />
        <Work active={active} onPress={setActive} />
        <Skills active={active} onPress={setActive} />
        <About />
      </main>
      <Footer />
    </>
  )
}
