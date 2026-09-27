import React from 'react'
import ReactDOM from 'react-dom/client'
// The console keeps the Bootstrap + Tailwind + Font Awesome look it was built with. They are
// bundled (not loaded from a CDN) so the console also works offline in an exam demo, and they
// only ever load on this page - the rest of the admin app uses the shared design tokens.
import 'bootstrap/dist/css/bootstrap.min.css'
import '@fortawesome/fontawesome-free/css/all.min.css'
import './index.css'
import App from './App'
import { api } from '@/lib/api'
import { getStoredSession } from '../lib/apiClient'
import { getAllBusRoutes } from '@/services/busRouteService'

// A few console services still read the caller's role from localStorage. Derive it from the
// one real session so it can never disagree with the token the API actually sees.
const session = getStoredSession()
if (session) {
  localStorage.setItem('auth_role', session.roles.includes('Admin') ? 'Admin' : session.roles[0] ?? 'Guest')
}

// Prime the operator lookup cache (read synchronously by some dropdowns) from the real API
// before the first render, but never block the console for more than a moment if it is slow.
const prime = Promise.race([
  Promise.allSettled([api.get('api/BusOperators'), getAllBusRoutes()]),
  new Promise((resolve) => setTimeout(resolve, 2500)),
])

prime.finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})
