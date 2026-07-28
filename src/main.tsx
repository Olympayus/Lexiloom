import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initDatabase } from './db/connection'
import './index.css'
import App from './App.tsx'

initDatabase().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}).catch(console.error)
