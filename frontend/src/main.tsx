import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import About from './About.tsx'

const page = window.location.pathname === '/about' ? <About /> : <App />

createRoot(document.getElementById('root')!).render(
  <StrictMode>{page}</StrictMode>,
)
