import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App.jsx'
import './index.css'

const googleClientId = import.meta.env.VITE_GOOGLE_SIGNIN_CLIENT_ID

if (!googleClientId) {
  console.warn('VITE_GOOGLE_SIGNIN_CLIENT_ID is missing in .env file. Google sign-in will fail.')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId || ''}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
