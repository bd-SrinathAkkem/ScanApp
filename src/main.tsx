import { StrictMode } from 'react'
import 'bootstrap/dist/css/bootstrap.css' // add this to use the bootsrap css file instead of the default styling sheet of this app
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
  
)

function MyComponent() {
  return (
    <div class="container">
      <h1>Hello World</h1>
      <button onclick="alert('Clicked!')">Click Me</button>
    </div>
  )
}

export default MyComponent
