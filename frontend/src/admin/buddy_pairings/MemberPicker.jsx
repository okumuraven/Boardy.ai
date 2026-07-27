import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';

// A minimal search-and-pick control, reusing the existing member search
// endpoint - just enough for choosing two people for a buddy pairing,
// not a general-purpose combobox component.
export default function MemberPicker({ label, selected, onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    apiFetch(`/api/admin/members?search=${encodeURIComponent(query)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => { if (!cancelled) setResults((data.members || []).slice(0, 8)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [query]);

  if (selected) {
    return (
      <div style={{ fontSize: '0.85rem' }}>
        <div className="admin-detail-field-label">{label}</div>
        <div style={{ color: 'var(--paper)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {selected.full_name || selected.email}
          <button type="button" className="btn-ghost btn-sm" onClick={() => onSelect(null)}>Change</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', flex: '1 1 200px' }}>
      <div className="admin-detail-field-label" style={{ marginBottom: '0.3rem' }}>{label}</div>
      <input
        type="text"
        placeholder="Search name, email, company..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: '100%', background: 'var(--ink-line)', border: '1px solid var(--ink-line-strong)', color: 'var(--paper)', borderRadius: '8px', padding: '0.5rem 0.7rem', boxSizing: 'border-box' }}
      />
      {results.length > 0 && (
        <div style={{ position: 'absolute', zIndex: 5, width: '100%', background: 'var(--ink-raised)', border: '1px solid var(--ink-line-strong)', borderRadius: '8px', marginTop: '0.25rem', maxHeight: '220px', overflowY: 'auto' }}>
          {results.map((m) => (
            <div
              key={m.id}
              onClick={() => { onSelect(m); setQuery(''); setResults([]); }}
              style={{ padding: '0.5rem 0.7rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--paper)', borderBottom: '1px solid var(--ink-line)' }}
            >
              {m.full_name || m.email} {m.company ? `· ${m.company}` : ''} {m.batch ? `· ${m.batch}` : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
