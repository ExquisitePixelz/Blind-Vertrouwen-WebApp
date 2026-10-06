import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'

// A screen's file can be gone from the server when a new version went live
// while this tab was open without the service worker (ARCHITECTURE.md 1.11 A1).
// Reload once to get the new version; unsent typing is kept (3.4).
window.addEventListener('vite:preloadError', (event) => {
  try {
    if (sessionStorage.getItem('theros:reloadedForUpdate')) return
    sessionStorage.setItem('theros:reloadedForUpdate', '1')
  } catch {
    return
  }
  event.preventDefault()
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
