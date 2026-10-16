import { lazy, Suspense, type ReactNode } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Nav } from './components/Nav'
import { Footer } from './components/Footer'
import { webSignInEnabled } from './config'
import { ToastProvider } from './app/components/Toast'
import { GetTheAppProvider } from './app/components/GetTheApp'
import { useDocumentTitle } from './app/hooks'
import { shouldRetry } from './app/queries'
import Home from './pages/Home'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import DeleteAccount from './pages/DeleteAccount'
import Search from './pages/Search'
import Place from './pages/Place'
import Gem from './pages/Gem'
import List from './pages/List'
import Profile from './pages/Profile'
import NotFound from './pages/NotFound'
import './app/app.css'

// Folded to null at build time when WEB_SIGN_IN_ENABLED isn't "true", so no sign-in code ships.
const WebAuth = webSignInEnabled ? lazy(() => import('./app/auth/WebAuth')) : null

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: shouldRetry, staleTime: 30_000, refetchOnWindowFocus: false },
  },
})

function Title({ value }: { value?: string }) {
  useDocumentTitle(value)
  return null
}

/** Pages with data set their own title; `title` is for static pages. */
function Page({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <motion.main
      id="main"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {title !== undefined && <Title value={title} />}
      {children}
    </motion.main>
  )
}

function AuthBoundary({ children }: { children: ReactNode }) {
  if (!WebAuth) return <>{children}</>
  return (
    <Suspense fallback={children}>
      <WebAuth>{children}</WebAuth>
    </Suspense>
  )
}

export default function App() {
  const location = useLocation()

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <ToastProvider>
          <GetTheAppProvider>
            <AuthBoundary>
              <a className="skip-link" href="#main">
                Skip to content
              </a>
              <Nav />
              <AnimatePresence initial={false} onExitComplete={() => window.scrollTo(0, 0)}>
                <Routes location={location} key={location.pathname}>
                  <Route path="/" element={<Page title="Unearth — the places that aren’t on the top-10 lists"><Home /></Page>} />
                  <Route path="/privacy" element={<Page title="Privacy Policy — Unearth"><Privacy /></Page>} />
                  <Route path="/terms" element={<Page title="Terms of Use — Unearth"><Terms /></Page>} />
                  <Route path="/delete-account" element={<Page title="Delete your account — Unearth"><DeleteAccount /></Page>} />
                  <Route path="/search" element={<Page><Search /></Page>} />
                  <Route path="/g/:slug" element={<Page><Gem /></Page>} />
                  <Route path="/u/:handle" element={<Page><Profile /></Page>} />
                  <Route path="/lists/:city/:kind" element={<Page><List /></Page>} />
                  <Route path="/:city" element={<Page><Place /></Page>} />
                  <Route path="/:city/:area" element={<Page><Place /></Page>} />
                  <Route path="/:city/:area/:category" element={<Page><Place /></Page>} />
                  <Route path="*" element={<Page><NotFound /></Page>} />
                </Routes>
              </AnimatePresence>
              <Footer />
            </AuthBoundary>
          </GetTheAppProvider>
        </ToastProvider>
      </MotionConfig>
    </QueryClientProvider>
  )
}
