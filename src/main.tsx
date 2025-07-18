import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'

// Try to render the app
console.log('Starting app...')
const rootElement = document.getElementById('root')

if (!rootElement) {
  console.error('Root element not found!')
} else {
  console.log('Root element found, creating React root...')
  try {
    const root = ReactDOM.createRoot(rootElement)
    root.render(<App />)
    console.log('App rendered successfully')
  } catch (error) {
    console.error('Error rendering app:', error)
  }
} 