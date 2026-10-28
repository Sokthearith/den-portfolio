import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './styles/site.css'
import App from './App'
import { paintGrain } from './lib/tokens'

paintGrain()

const root = document.getElementById('root')!
const app = (
  <StrictMode>
    <App />
  </StrictMode>
)

// The production build prerenders the page into #root, so it reads without
// scripting; hydrate it there, render fresh in dev.
if (root.hasChildNodes()) hydrateRoot(root, app)
else createRoot(root).render(app)
