import { Link } from 'react-router-dom'
import { Logo } from './Logo'
import { site } from '../config'

const year = new Date().getFullYear()

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <Logo size={30} />
          <span>Unearth</span>
        </div>
        <p className="footer__tag">Real finds only. Public places only. Respect the gem.</p>
        <nav className="footer__links" aria-label="Footer">
          <a href="/#how">How it works</a>
          <Link to="/search">Search</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
        </nav>
        <p className="footer__copy">© {year} Unearth. Made in India.</p>
        <p className="footer__attribution">
          Place names ©{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            OpenStreetMap contributors
          </a>
        </p>
      </div>
    </footer>
  )
}
