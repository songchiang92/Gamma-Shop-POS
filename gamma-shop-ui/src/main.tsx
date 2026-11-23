import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@coreui/coreui-pro/dist/css/coreui.min.css'
import './index.css'
import App from './App.tsx'
import { applyTheme, readInitialTheme } from './state/ThemeContext.tsx'

// Set the theme attribute before the first paint so there's no light/dark flash.
applyTheme(readInitialTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
