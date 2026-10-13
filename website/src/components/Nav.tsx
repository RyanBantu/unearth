import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { motion, useMotionValueEvent, useScroll } from 'motion/react'
import { Logo } from './Logo'

const sections = [
  { href: '/#how', label: 'How it works' },
  { href: '/#features', label: 'Features' },
  { href: '/#why', label: 'Why Unearth' },
  { href: '/#principles', label: 'Principles' },
]

export function Nav() {
  const { scrollY } = useScroll()
  const [hidden, setHidden] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0
    setHidden(y > prev && y > 240)
    setScrolled(y > 12)
  })

  return (
    <motion.header
      className={`nav ${scrolled ? 'nav--scrolled' : ''}`}
      animate={{ y: hidden ? '-110%' : '0%' }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="nav__inner">
        <Link to="/" className="nav__brand">
          <Logo size={34} animate />
          <span>Unearth</span>
        </Link>
        <nav className="nav__links" aria-label="Main">
          {sections.map((s) => (
            <a key={s.href} href={s.href}>
              {s.label}
            </a>
          ))}
          <NavLink to="/privacy">Privacy</NavLink>
        </nav>
        <a className="nav__cta" href="/#download">
          Get the app
        </a>
      </div>
    </motion.header>
  )
}
