import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';

// §7.4's "documentation of the matching logic and how it improves with
// more data" ask, satisfied by aggregating a field already captured per
// decline but never rolled up before now.
export default function DeclineReasonsView() {
  const [reasons, setReasons] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/admin/matches/decline_reasons')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setReasons(data.reasons || []))
      .catch(() => setError("Couldn't load decline reasons."));
  }, []);

  if (error) return <div className="admin-empty-state">{error}</div>;
  if (!reasons) return <div className="admin-empty-state">Loading...</div>;
  if (reasons.length === 0) return <div className="admin-empty-state">No declined matches with a recorded reason yet.</div>;

  const max = Math.max(...reasons.map((r) => r.count));

  return (
    <div>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
        Why matches get declined, aggregated across the whole platform - the closest thing to a live signal
        of where the matching logic still needs work.
      </p>
      {reasons.map((r) => (
        <div key={r.reason} style={{ marginBottom: '0.9rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--paper)', marginBottom: '0.25rem' }}>
            <span>{r.reason}</span>
            <span style={{ color: 'var(--muted)' }}>{r.count}</span>
          </div>
          <div style={{ height: '6px', borderRadius: '4px', background: 'var(--ink-line)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(r.count / max) * 100}%`, background: 'var(--brass)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
