import { useState } from 'react';
import { apiFetch } from '../../lib/api';

// Staff never go through ProfileSetup's full member onboarding (role/
// industry/company/phone/voice interview) - their role is already
// fixed by whoever invited them. Just enough to identify them in the
// admin UI. See "Admin panel.md" §11.
export default function AdminMinimalOnboarding({ initialName, onSaved }) {
  const [fullName, setFullName] = useState(initialName || '');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    setSaving(true);
    setError('');
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), 20_000);
    try {
      const res = await apiFetch('/api/admin/me', {
        method: 'PATCH',
        body: JSON.stringify({ full_name: fullName.trim(), location: location.trim() }),
        signal: timeoutController.signal,
      });
      if (!res.ok) throw new Error('failed');
      onSaved();
    } catch (err) {
      setError(
        err.name === 'AbortError'
          ? 'This is taking longer than expected. Check your connection and try again.'
          : "Couldn't save. Please try again.",
      );
    } finally {
      clearTimeout(timeoutId);
      setSaving(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '380px', textAlign: 'left' }}>
      <p style={{ color: 'var(--paper)', fontSize: '1rem', marginBottom: '0.3rem' }}>Just a couple details</p>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
        Your role is already set by whoever invited you - this is just so the team knows who's who.
      </p>
      <form onSubmit={submit}>
        <label style={{ display: 'block', color: 'var(--muted)', fontSize: '0.78rem', marginBottom: '0.3rem' }}>Full name</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          style={{ width: '100%', marginBottom: '0.9rem', background: 'var(--ink-line)', border: '1px solid var(--ink-line-strong)', color: 'var(--paper)', borderRadius: '8px', padding: '0.55rem 0.7rem', boxSizing: 'border-box' }}
        />
        <label style={{ display: 'block', color: 'var(--muted)', fontSize: '0.78rem', marginBottom: '0.3rem' }}>Location</label>
        <input
          type="text"
          placeholder="e.g. Nairobi, Kenya"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          style={{ width: '100%', marginBottom: '1.1rem', background: 'var(--ink-line)', border: '1px solid var(--ink-line-strong)', color: 'var(--paper)', borderRadius: '8px', padding: '0.55rem 0.7rem', boxSizing: 'border-box' }}
        />
        <button type="submit" className="btn-primary" disabled={saving || !fullName.trim()} style={{ width: '100%' }}>
          {saving ? 'Saving...' : 'Continue'}
        </button>
        {error && <p style={{ color: 'var(--warn)', fontSize: '0.82rem', marginTop: '0.75rem' }}>{error}</p>}
      </form>
    </div>
  );
}
