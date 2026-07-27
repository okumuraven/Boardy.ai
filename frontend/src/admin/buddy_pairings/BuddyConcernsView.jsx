import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';

// Moderator+ only - "buddies raise real concerns to the Kuzana team if
// they observe risk to their partner's business" (kuzana_playbook.md
// §6). Never shows which of the two buddies is "at risk" beyond what
// the reporter chose to say - matches the Playbook's own
// confidentiality rule (escalating to Kuzana is the one exception).
export default function BuddyConcernsView({ admin }) {
  const [concerns, setConcerns] = useState(null);
  const [error, setError] = useState('');
  const [resolvingId, setResolvingId] = useState(null);
  const canResolve = admin && ['moderator', 'superadmin'].includes(admin.admin_role);

  const load = () => {
    apiFetch('/api/admin/buddy_pairings/concerns')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setConcerns(data.concerns || []))
      .catch(() => setError("Couldn't load concerns."));
  };

  useEffect(load, []);

  const resolve = async (id) => {
    setResolvingId(id);
    try {
      const res = await apiFetch(`/api/admin/buddy_pairings/concerns/${id}/resolve`, { method: 'PATCH' });
      if (res.ok) load();
    } finally {
      setResolvingId(null);
    }
  };

  if (error) return <div className="admin-empty-state">{error}</div>;
  if (!concerns) return <div className="admin-empty-state">Loading...</div>;
  if (concerns.length === 0) return <div className="admin-empty-state">No open concerns.</div>;

  return (
    <div>
      {concerns.map((c) => (
        <div key={c.id} className="panel" style={{ marginBottom: '1rem', textAlign: 'left' }}>
          <p className="panel-label">Raised by {c.reporter?.name || `#${c.reporter?.id}`} &middot; {new Date(c.inserted_at).toLocaleString()}</p>
          <p style={{ color: 'var(--paper)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>{c.message}</p>
          {canResolve && (
            <button className="btn-ghost btn-sm" onClick={() => resolve(c.id)} disabled={resolvingId === c.id}>
              {resolvingId === c.id ? '...' : 'Mark resolved'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
