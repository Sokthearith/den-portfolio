import { useState } from 'react'
import About from '../components/About'
import Hero from '../components/Hero'
import Now from '../components/Now'
import Skills from '../components/Skills'
import Work from '../components/Work'
import { profile } from '../data/profile'
import { defaultSkill } from '../data/skills'

export default function Home() {
  // The pressed key on the rack; Work lights the projects that use it.
  const [active, setActive] = useState(defaultSkill)

  return (
    <>
      <Hero
        name={profile.wordmark}
        title={`${profile.wordmark}, ${profile.role.toLowerCase()}`}
        sentence={profile.sentence}
      />
      <Work active={active} onPress={setActive} />
      <Skills active={active} onPress={setActive} />
      <About />
      <Now />
    </>
  )
}
