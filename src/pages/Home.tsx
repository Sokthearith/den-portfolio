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
        title={profile.headline}
        lede={profile.lede}
        actions={
          <>
            <a className="btn btn--primary" href={`mailto:${profile.email}`}>Email me</a>
            <a className="btn" href="/#work">See my work</a>
          </>
        }
      />
      <Work active={active} onPress={setActive} />
      <Skills active={active} onPress={setActive} />
      <About />
      <Now />
    </>
  )
}
