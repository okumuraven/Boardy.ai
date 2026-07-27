import { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { apiFetch, getToken, setToken, clearToken } from '../lib/api';
import AdminShell from './AdminShell';
import InviteAcceptView from './invite/InviteAcceptView';

const inviteToken = new URLSearchParams(window.location.search).get('invite');

// The Kuzana staff entry point - completely separate React tree from the
// member-facing App (see main.jsx's pathname branch), sharing only the
// Google OAuth provider and the generic apiFetch helper. Reaching this
// component at all requires nothing special - the actual security
// boundary is server-side (VokaziWeb.AdminPlug, checked fresh on every
// request); this is only ever the client-side reflection of that check.
// See "Admin panel.md" §11.
export default function AdminApp() {
  // signed_out | checking | authorized | forbidden
  const [status, setStatus] = useState(getToken() ? 'checking' : 'signed_out');
  const [admin, setAdmin] = useState(null);
  const [error, setError] = useState('');
  // An invite link must always be honored, even in a browser that
  // already has someone else's admin session stored - otherwise
  // opening the link just silently shows whoever's already logged in
  // here instead of letting the invited account accept it. Only once
  // this flow itself completes do we fall through to the normal
  // authorized/AdminShell branch below.
  const [inviteHandled, setInviteHandled] = useState(false);

  const checkWhoami = async () => {
    setStatus('checking');
    try {
      const res = await apiFetch('/api/admin/whoami');
      if (res.status === 403) {
        setStatus('forbidden');
        return;
      }
      if (!res.ok) throw new Error('whoami failed');
      const data = await res.json();
      setAdmin(data);
      setStatus('authorized');
    } catch {
      setStatus('forbidden');
    }
  };

  useEffect(() => {
    if (getToken()) checkWhoami();
  }, []);

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    try {
      const res = await apiFetch('/api/auth/google/signin', {
        method: 'POST',
        body: JSON.stringify({ id_token: credentialResponse.credential }),
      });
      if (!res.ok) throw new Error('Could not verify Google sign-in.');
      const data = await res.json();
      setToken(data.token);
      await checkWhoami();
    } catch {
      setError("Couldn't sign in. Please try again.");
    }
  };

  const handleLogout = () => {
    clearToken();
    setAdmin(null);
    setStatus('signed_out');
  };

  if (inviteToken && !inviteHandled) {
    const handleAccepted = async () => {
      setInviteHandled(true);
      await checkWhoami();
    };

    return (
      <div style={{ width: '100%', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.6rem', marginBottom: '1.5rem', color: 'var(--paper)', textAlign: 'center' }}>
            Kuzana Connect <span className="accent-text">Admin</span>
          </h1>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <InviteAcceptView token={inviteToken} onAccepted={handleAccepted} />
          </div>
        </div>
      </div>
    );
  }

  if (status === 'authorized' && admin) {
    return <AdminShell admin={admin} onLogout={handleLogout} />;
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '420px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.6rem', marginBottom: '0.5rem', color: 'var(--paper)' }}>
          Kuzana Connect <span className="accent-text">Admin</span>
        </h1>

        {status === 'checking' && (
          <div style={{ marginTop: '2rem' }}>
            <div className="spinner" style={{ width: '28px', height: '28px', margin: '0 auto' }}></div>
          </div>
        )}

        {status === 'signed_out' && (
          <>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '0.5rem 0 2rem' }}>
              Staff sign-in only.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Couldn't sign in. Please try again.")}
                theme="outline"
                size="large"
                text="continue_with"
              />
            </div>
          </>
        )}

        {status === 'forbidden' && (
          <div className="panel warn" style={{ marginTop: '1.5rem', textAlign: 'left' }}>
            <p className="panel-label warn">Not authorized</p>
            <p style={{ color: 'var(--paper)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              This account doesn't have access to the Kuzana Connect admin panel.
            </p>
            <button onClick={handleLogout} className="btn-ghost">Sign in with a different account</button>
          </div>
        )}

        {error && <p style={{ color: 'var(--warn)', fontSize: '0.85rem', marginTop: '1rem' }}>{error}</p>}
      </div>
    </div>
  );
}
