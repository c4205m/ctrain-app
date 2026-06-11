import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './index.css'
import './utils/pwaUpdate'
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/ctrain-app">
      <App />
      <Toaster position="top-center" richColors />
    </BrowserRouter>
  </StrictMode>,
)
