import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';

export default function StatsView() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/admin/stats')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setStats)
      .catch(() => setError("Couldn't load stats."));
  }, []);

  if (error) return <div className="admin-empty-state">{error}</div>;
  if (!stats) return <div className="admin-empty-state">Loading...</div>;

  return (
    <div>
      <div className="admin-stats-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard label="Total members" value={stats.total_members} />
        <StatCard label="Onboarded" value={stats.onboarded_members} />
        <StatCard label="Verified" value={stats.verified_members} />
      </div>

      <div className="panel" style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
        <p className="panel-label">Onboarding funnel</p>
        <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: '1rem' }}>
          Where people drop off - the highest-leverage place to follow up, per Kuzana's own playbook.
        </p>
        <FunnelBar label="Signed in" value={stats.funnel.signed_in} max={stats.funnel.signed_in} />
        <FunnelBar label="Profile completed" value={stats.funnel.profile_completed} max={stats.funnel.signed_in} />
        <FunnelBar label="Interview completed" value={stats.funnel.interview_completed} max={stats.funnel.signed_in} />
      </div>

      <div className="panel" style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
        <p className="panel-label">Matches by status</p>
        <div className="admin-detail-grid">
          {Object.entries(stats.matches_by_status).map(([status, count]) => (
            <Field key={status} label={status.replace(/_/g, ' ')} value={count} />
          ))}
        </div>
      </div>

      <div className="panel" style={{ textAlign: 'left' }}>
        <p className="panel-label">Capital-side pipeline</p>
        <div className="admin-detail-grid" style={{ marginBottom: '0.75rem' }}>
          <Field label="Founders seeking funding" value={stats.capital_side.founders_seeking_funding} />
          <Field label="Investors + lenders" value={stats.capital_side.investors_and_lenders} />
        </div>
        {Object.keys(stats.capital_side.funding_type_breakdown).length > 0 && (
          <>
            <div className="admin-detail-field-label" style={{ marginBottom: '0.4rem' }}>Funding type breakdown</div>
            <div className="admin-detail-grid">
              {Object.entries(stats.capital_side.funding_type_breakdown).map(([type, count]) => (
                <Field key={type} label={type.replace(/_/g, ' ')} value={count} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="admin-stat-card">
      <div className="admin-stat-value">{value}</div>
      <div className="admin-stat-label">{label}</div>
    </div>
  );
}

function FunnelBar({ label, value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div style={{ marginBottom: '0.9rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--paper)', marginBottom: '0.25rem' }}>
        <span>{label}</span>
        <span style={{ color: 'var(--muted)' }}>{value} ({pct}%)</span>
      </div>
      <div style={{ height: '6px', borderRadius: '4px', background: 'var(--ink-line)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--brass)' }} />
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div className="admin-detail-field-label">{label}</div>
      <div className="admin-detail-field-value">{value}</div>
    </div>
  );
}
