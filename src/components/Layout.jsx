import { Suspense, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import CookieNotice from './CookieNotice'
import ErrorBoundary from './ErrorBoundary'
import Footer from './Footer'
import Header from './Header'
import { Spinner } from './ui'

export default function Layout() {
  const location = useLocation()
  const first = useRef(location.pathname)
  useEffect(() => {
    window.scrollTo(0, 0)
    // El JSON-LD del HTML inicial describe sólo la primera página visitada
    if (location.pathname !== first.current) {
      document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => s.remove())
    }
  }, [location.pathname])
  return (
    <>
      <a className="skip-link" href="#main">Saltar al contenido</a>
      <Header />
      <main id="main" className="container page" tabIndex={-1}>
        <ErrorBoundary resetKey={location.pathname}>
          <Suspense fallback={<Spinner />}><Outlet /></Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
      <CookieNotice />
    </>
  )
}
