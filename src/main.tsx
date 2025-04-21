import { StrictMode } from 'react'
import 'bootstrap/dist/css/bootstrap.css' // add this to use the bootsrap css file instead of the default styling sheet of this app
import App from './App.tsx'
import Example from './Example.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Example />
    <App />
  </StrictMode>,
)
