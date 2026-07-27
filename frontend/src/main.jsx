import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App.jsx'
import AdminApp from './admin/AdminApp.jsx'
import './index.css'

const googleClientId = import.meta.env.VITE_GOOGLE_SIGNIN_CLIENT_ID

if (!googleClientId) {
  console.warn('VITE_GOOGLE_SIGNIN_CLIENT_ID is missing in .env file. Google sign-in will fail.')
}

// Kuzana staff reach a completely separate React tree at /admin - no
// router library needed for one split point. The two trees share only
// this Google OAuth provider (identical sign-in flow) and the generic
// apiFetch helper - no shared state, no shared member-app assumptions.
// See "Admin panel.md" §11.
const isAdminRoute = window.location.pathname.startsWith('/admin')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId || ''}>
      {isAdminRoute ? <AdminApp /> : <App />}
    </GoogleOAuthProvider>
  </StrictMode>,
)
