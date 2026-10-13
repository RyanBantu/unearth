import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { Nav } from './components/Nav'
import { Footer } from './components/Footer'
import Home from './pages/Home'
import Privacy from './pages/Privacy'

function Page({ children }: { children: React.ReactNode }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.main>
  )
}

export default function App() {
  const location = useLocation()

  useEffect(() => {
    document.title =
      location.pathname === '/privacy'
        ? 'Privacy Policy — Unearth'
        : "Unearth — the places that aren't on the top-10 lists"
  }, [location.pathname])

  return (
    <MotionConfig reducedMotion="user">
      <Nav />
      <AnimatePresence mode="wait" onExitComplete={() => window.scrollTo(0, 0)}>
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <Page>
                <Home />
              </Page>
            }
          />
          <Route
            path="/privacy"
            element={
              <Page>
                <Privacy />
              </Page>
            }
          />
          <Route
            path="*"
            element={
              <Page>
                <Home />
              </Page>
            }
          />
        </Routes>
      </AnimatePresence>
      <Footer />
    </MotionConfig>
  )
}
