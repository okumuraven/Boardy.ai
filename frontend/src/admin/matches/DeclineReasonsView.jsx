import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';

function ReasonsList({ endpoint, emptyLabel }) {
  const [reasons, setReasons] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch(endpoint)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setReasons(data.reasons || []))
      .catch(() => setError("Couldn't load decline reasons."));
  }, [endpoint]);

  if (error) return <div className="admin-empty-state">{error}</div>;
  if (!reasons) return <div className="admin-empty-state">Loading...</div>;
  if (reasons.length === 0) return <div className="admin-empty-state">{emptyLabel}</div>;

  const max = Math.max(...reasons.map((r) => r.count));

  return (
    <div>
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

// §7.4's "documentation of the matching logic and how it improves with
// more data" ask, satisfied by aggregating a field already captured per
// decline but never rolled up before now. Bizi's own declined-application
// reasons (Phase E) share the same free-text-groupby shape, so they get
// a second section here rather than a redundant new nav tab.
export default function DeclineReasonsView() {
  return (
    <div>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
        Why matches get declined, aggregated across the whole platform - the closest thing to a live signal
        of where the matching logic still needs work.
      </p>
      <ReasonsList endpoint="/api/admin/matches/decline_reasons" emptyLabel="No declined matches with a recorded reason yet." />

      <p style={{ color: 'var(--brass)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '2rem 0 0.75rem' }}>
        Bizi applications
      </p>
      <ReasonsList endpoint="/api/admin/bizi_applications/decline_reasons" emptyLabel="No declined Bizi applications with a recorded reason yet." />
    </div>
  );
}
