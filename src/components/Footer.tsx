import { profile } from '../data/profile'

const year = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className="footer" aria-labelledby="footer-title">
      <div className="container">
        <p className="footer__statement" id="footer-title" data-reveal="head">{profile.closing}</p>
        <a className="footer__email" href={`mailto:${profile.email}`}>{profile.email}</a>
        <div className="footer__base">
          <ul className="footer__links">
            <li><a href={profile.links.github} target="_blank" rel="noreferrer">GitHub</a></li>
            <li><a href={profile.links.linkedin} target="_blank" rel="noreferrer">LinkedIn</a></li>
            <li><a href="#top">Back to the top</a></li>
          </ul>
          <p className="footer__legal">{profile.name}, {year}</p>
        </div>
      </div>
    </footer>
  )
}
