import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValueEvent, useScroll, type Variants } from 'motion/react'
import { Logo } from './Logo'
import { AppStoreButton } from './AppStoreButton'

const sections = [
  { href: '/#how', label: 'How it works' },
  { href: '/#features', label: 'Features' },
  { href: '/#why', label: 'Why Unearth' },
  { href: '/#principles', label: 'Principles' },
]

const legal = [
  { to: '/privacy', label: 'Privacy' },
  { to: '/terms', label: 'Terms' },
]

const menu: Variants = {
  closed: { opacity: 0, y: -12, transition: { duration: 0.2 } },
  open: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 380, damping: 32, staggerChildren: 0.04 } },
}
const menuItem: Variants = {
  closed: { opacity: 0, x: -12 },
  open: { opacity: 1, x: 0 },
}

function Burger({ open }: { open: boolean }) {
  const line = { stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <motion.line x1="4" x2="20" {...line} animate={open ? { y1: 12, y2: 12, rotate: 45 } : { y1: 7, y2: 7, rotate: 0 }} />
      <motion.line x1="4" x2="20" y1="12" y2="12" {...line} animate={{ opacity: open ? 0 : 1 }} />
      <motion.line x1="4" x2="20" {...line} animate={open ? { y1: 12, y2: 12, rotate: -45 } : { y1: 17, y2: 17, rotate: 0 }} />
    </svg>
  )
}

export function Nav() {
  const { scrollY } = useScroll()
  const [hidden, setHidden] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0
    setHidden(y > prev && y > 240)
    setScrolled(y > 12)
  })

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onResize = () => window.innerWidth > 960 && setOpen(false)
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  return (
    <motion.header
      className={`nav ${scrolled || open ? 'nav--scrolled' : ''}`}
      animate={{ y: hidden && !open ? '-110%' : '0%' }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="nav__inner">
        <Link to="/" className="nav__brand" onClick={() => setOpen(false)}>
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
        <a className="nav__cta" href="/#download" onClick={() => setOpen(false)}>
          Get the app
        </a>
        <button
          type="button"
          className="nav__burger"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <Burger open={open} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="nav__scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.nav
              id="mobile-menu"
              className="nav__menu"
              aria-label="Menu"
              variants={menu}
              initial="closed"
              animate="open"
              exit="closed"
            >
              {sections.map((s) => (
                <motion.a key={s.href} href={s.href} variants={menuItem} onClick={() => setOpen(false)}>
                  {s.label}
                </motion.a>
              ))}
              <motion.div className="nav__menu-legal" variants={menuItem}>
                {legal.map((l) => (
                  <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)}>
                    {l.label}
                  </NavLink>
                ))}
              </motion.div>
              <motion.div className="nav__menu-cta" variants={menuItem}>
                <AppStoreButton />
              </motion.div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
