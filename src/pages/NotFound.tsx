import Hero from '../components/Hero'

// Lost in the dark: the town asleep, only den's window still on, and one
// way back.
export default function NotFound() {
  return (
    <Hero
      name="dark"
      title="This page is dark"
      sentence="Nothing lives at this address. Follow the light home."
      lightsOut={1}
      actions={<a className="btn btn--primary" href="/">Back home</a>}
    />
  )
}
