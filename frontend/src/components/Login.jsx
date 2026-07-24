import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { apiFetch, setToken } from '../lib/api';
import KuzanaMark from './KuzanaMark';

export default function Login({ onBack, onSignedIn }) {
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleGoogleSuccess = async (credentialResponse) => {
    setIsVerifying(true);
    setError('');

    try {
      const response = await apiFetch('/api/auth/google/signin', {
        method: 'POST',
        body: JSON.stringify({ id_token: credentialResponse.credential }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Could not verify Google sign-in.');
      }

      const data = await response.json();
      setToken(data.token);
      onSignedIn(data.user);
    } catch (err) {
      console.error('Google sign-in failed:', err);
      setError("Couldn't sign you in with Google. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

      <nav className="nav-bar">
        <div className="brand-logo-container">
          <div className="brand-mark"><KuzanaMark /></div>
          <span className="brand-text">Kuzana Connect</span>
        </div>
        <button onClick={onBack} className="nav-link">
          ← Back
        </button>
      </nav>

      <main className="onboarding-container" style={{ animation: 'fadeUpIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
        <div className="onboarding-content">
          <h1 className="ai-greeting" style={{ fontSize: '2.3rem', marginBottom: '1rem', animationDelay: '0.1s' }}>
            Sign in with <span className="accent-text">Google</span>
          </h1>

          <p className="ai-subtext" style={{ maxWidth: '500px', animationDelay: '0.2s', marginBottom: '3rem' }}>
            To start your voice interview, verify your identity with Google. It only takes a moment.
          </p>

          <div style={{ opacity: 0, animation: 'fadeUpIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards', animationDelay: '0.4s' }}>
            {isVerifying ? (
              <div className="spinner" style={{ width: '32px', height: '32px' }}></div>
            ) : (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Couldn't sign you in with Google. Please try again.")}
                theme="outline"
                size="large"
                text="continue_with"
              />
            )}
          </div>
          {error && (
            <p style={{ color: 'var(--warn)', fontSize: '0.9rem', marginTop: '1rem' }}>{error}</p>
          )}
        </div>

        <div className="onboarding-visual">
          <KuzanaMark />
        </div>
      </main>
    </div>
  );
}
