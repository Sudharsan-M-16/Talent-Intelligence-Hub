import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Clean up old Zustand auth-storage key that's no longer used (authStore no longer uses persist middleware)
try {
  if (localStorage.getItem('auth-storage')) {
    localStorage.removeItem('auth-storage')
  }
} catch {}

// Apply persisted or default theme before first paint (prevents flash)
const storedTheme = localStorage.getItem('tih-theme') as 'light' | 'dark' | null
document.documentElement.setAttribute('data-theme', storedTheme ?? 'dark')

// Guard against localStorage quota errors so Zustand persist middleware never
// throws uncaught exceptions when storage is full.
const _origSetItem = localStorage.setItem.bind(localStorage)
localStorage.setItem = (...args: Parameters<typeof localStorage.setItem>) => {
  try {
    _origSetItem(...args)
  } catch (e) {
    console.warn('localStorage quota exceeded — some data may not persist', e)
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
