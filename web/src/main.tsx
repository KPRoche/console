import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
// Initialize i18n before rendering
import './lib/i18n'

// Suppress recharts dimension warnings (these occur when charts render before container is sized)
const originalWarn = console.warn
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('width') && args[0].includes('height') && args[0].includes('chart should be greater than 0')) {
    return // Suppress recharts dimension warnings
  }
  originalWarn.apply(console, args)
}

// Enable MSW mock service worker in demo mode (Netlify previews)
const enableMocking = async () => {
  // Check env var OR detect Netlify domain (more reliable)
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true' ||
    window.location.hostname.includes('netlify.app')

  if (!isDemoMode) {
    return
  }

  const { worker } = await import('./mocks/browser')

  // Start the worker with onUnhandledRequest set to bypass
  // to allow external resources (fonts, images) to load normally
  return worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  })
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  )
})
