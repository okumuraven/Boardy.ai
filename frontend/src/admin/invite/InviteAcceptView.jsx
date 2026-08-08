import { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { apiFetch, setToken } from '../../lib/api';
import AdminMinimalOnboarding from './AdminMinimalOnboarding';

const ADMIN_ROLE_LABELS = { support: 'Support', moderator: 'Moderator', superadmin: 'Superadmin' };

// Reached via the link in the invite email (/admin?invite=<token>) -
// the only way an invite is ever consumed (see
// VokaziWeb.Admin.InviteAcceptController). Distinct from the regular
// staff sign-in screen: this one previews who/what the invite is for
// before asking anyone to sign in, and rejects a mismatched Google
// account with a specific, actionable message instead of a generic
// "not authorized." See "Admin panel.md" §6.
export default function InviteAcceptView({ token, onAccepted }) {
  // loading | valid | expired | not_found | accepting | needs_profile | error
  const [status, setStatus] = useState('loading');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [acceptedUser, setAcceptedUser] = useState(null);

  useEffect(() => {
    apiFetch(`/api/admin/invites/${token}`)
      .then(async (res) => {
        if (res.status === 410) return setStatus('expired');
        if (res.status === 404) return setStatus('not_found');
        if (!res.ok) throw new Error('failed');
        setPreview(await res.json());
        setStatus('valid');
      })
      .catch(() => setStatus('error'));
  }, [token]);

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setStatus('accepting');
    // No fetch has a default timeout - without this, a slow response (a
    // Workspace account's own sign-in friction, a network hiccup, a
    // momentarily slow backend) leaves someone staring at a screen with
    // no way to tell "still working" from "silently broken," and no way
    // to recover other than blindly reloading and hoping. This is the
    // exact failure mode that made a real invite take ~20 hours to land
    // even though it eventually succeeded on its own.
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), 20_000);
    try {
      const res = await apiFetch(`/api/admin/invites/${token}/accept`, {
        method: 'POST',
        body: JSON.stringify({ id_token: credentialResponse.credential }),
        signal: timeoutController.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't accept this invite.");
        setStatus('valid');
        return;
      }
      setToken(data.token);
      if (data.needs_profile) {
        setAcceptedUser(data.user);
        setStatus('needs_profile');
      } else {
        onAccepted();
      }
    } catch (err) {
      setError(
        err.name === 'AbortError'
          ? "This is taking longer than expected. Check your connection and try again - your invite is still valid."
          : "Couldn't accept this invite. Please try again.",
      );
      setStatus('valid');
    } finally {
      clearTimeout(timeoutId);
    }
  };

  if (status === 'loading') {
    return <div className="spinner" style={{ width: '28px', height: '28px' }}></div>;
  }

  if (status === 'expired') {
    return (
      <div className="panel warn" style={{ maxWidth: '380px', textAlign: 'left' }}>
        <p className="panel-label warn">This invite has expired</p>
        <p style={{ color: 'var(--paper)', fontSize: '0.9rem' }}>Ask whoever invited you to send a fresh one.</p>
      </div>
    );
  }

  if (status === 'not_found') {
    return (
      <div className="panel warn" style={{ maxWidth: '380px', textAlign: 'left' }}>
        <p className="panel-label warn">Invite not found</p>
        <p style={{ color: 'var(--paper)', fontSize: '0.9rem' }}>This link isn't valid - check you copied the whole thing.</p>
      </div>
    );
  }

  if (status === 'error') {
    return <p style={{ color: 'var(--warn)', fontSize: '0.9rem' }}>Couldn't load this invite. Please try again.</p>;
  }

  if (status === 'needs_profile' && acceptedUser) {
    return <AdminMinimalOnboarding initialName={acceptedUser.full_name} onSaved={onAccepted} />;
  }

  return (
    <div style={{ maxWidth: '380px', textAlign: 'left' }}>
      <p style={{ color: 'var(--paper)', fontSize: '1rem', marginBottom: '0.3rem' }}>
        You've been invited as <strong>{ADMIN_ROLE_LABELS[preview.admin_role] || preview.admin_role}</strong>
      </p>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
        Sign in with <strong>{preview.email}</strong> to accept. This invite expires{' '}
        {new Date(preview.expires_at).toLocaleString()}.
      </p>
      {status === 'accepting' ? (
        // Swapped in for the Google button entirely, not just a small
        // note alongside it left clickable - a slow-but-working request
        // needs to be unmistakable, not something you'd second-guess and
        // click through again.
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0' }}>
          <div className="spinner" style={{ width: '18px', height: '18px' }}></div>
          <p style={{ color: 'var(--paper)', fontSize: '0.9rem', margin: 0 }}>
            Verifying your Google account and setting up your admin access...
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError("Couldn't sign in. Please try again.")}
            theme="outline"
            size="large"
            text="continue_with"
          />
        </div>
      )}
      {error && <p style={{ color: 'var(--warn)', fontSize: '0.85rem', marginTop: '0.75rem' }}>{error}</p>}
    </div>
  );
}
