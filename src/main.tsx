import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './styles/site.css'
import App from './App'
import { paintGrain } from './lib/tokens'

paintGrain()

const root = document.getElementById('root')!
// A prerendered page names its route (the 404 is served at any address);
// in dev the address decides.
const path = root.dataset.route ?? location.pathname
const app = (
  <StrictMode>
    <App path={path} />
  </StrictMode>
)

// The production build prerenders each page into #root, so it reads without
// scripting; hydrate it there, render fresh in dev.
if (root.hasChildNodes()) hydrateRoot(root, app)
else createRoot(root).render(app)
