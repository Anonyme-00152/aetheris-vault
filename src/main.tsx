import { StrictMode, Suspense, lazy, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { Route, Switch, useLocation } from 'wouter'
import { ToastProvider } from './components/toast'
import './index.css'
import Home from './pages/home'
import NotFound from './pages/not-found'

const Check = lazy(() => import('./pages/check'))
const Security = lazy(() => import('./pages/security'))
const Vault = lazy(() => import('./pages/vault/vault-page'))

function ScrollManager() {
  const [location] = useLocation()
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (hash) requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView())
    else window.scrollTo(0, 0)
  }, [location])
  return null
}

function App() {
  return (
    <ToastProvider>
      <ScrollManager />
      <Suspense fallback={<div className="min-h-dvh" />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/verifier" component={Check} />
          <Route path="/securite" component={Security} />
          <Route path="/coffre" component={Vault} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </ToastProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}
