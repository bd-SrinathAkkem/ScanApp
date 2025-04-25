import { StrictMode } from 'react'
import 'bootstrap/dist/css/bootstrap.css' // add this to use the bootsrap css file instead of the default styling sheet of this app
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// Version v1.0.0
// Created by: SR
