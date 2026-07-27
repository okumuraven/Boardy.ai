import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';

const OUTCOMES = ['confirmed_valuable', 'attempted_no_result', 'unresponsive'];

export default function MatchDetailView({ matchId, admin, onBack }) {
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [outcomeStatus, setOutcomeStatus] = useState('');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const canRecordOutcome = admin && ['moderator', 'superadmin'].includes(admin.admin_role);

  const load = () => {
    setLoading(true);
    setError('');
    apiFetch(`/api/admin/matches/${matchId}`)
      .then((res) => {
        if (res.status === 404) throw new Error('not_found');
        if (!res.ok) throw new Error('failed');
        return res.json();
      })
      .then((data) => {
        setMatch(data);
        setOutcomeStatus(data.outcome_status || '');
        setOutcomeNotes(data.outcome_notes || '');
      })
      .catch((e) => setError(e.message === 'not_found' ? 'Match not found.' : "Couldn't load this match."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [matchId]);

  const submitOutcome = async (e) => {
    e.preventDefault();
    if (!outcomeStatus) return;
    setSaving(true);
    setSaveError('');
    try {
      const res = await apiFetch(`/api/admin/matches/${matchId}/outcome`, {
        method: 'POST',
        body: JSON.stringify({ outcome_status: outcomeStatus, outcome_notes: outcomeNotes }),
      });
      if (!res.ok) throw new Error('failed');
      load();
    } catch {
      setSaveError("Couldn't save the outcome. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <button className="admin-back-link" onClick={onBack}>&larr; Back to matches</button>

      {loading && <div className="admin-empty-state">Loading...</div>}
      {error && <div className="admin-empty-state">{error}</div>}

      {!loading && !error && match && (
        <>
          <h2 style={{ color: 'var(--paper)', marginBottom: '1rem' }}>
            {match.user_a?.name || '?'} &harr; {match.user_b?.name || '?'}
          </h2>

          <div className="admin-detail-grid">
            <Field label="Status" value={match.status} />
            <Field label="AI score" value={match.ai_score != null ? match.ai_score : '-'} />
            <Field label="Decline reason" value={match.decline_reason || '-'} />
            <Field label="Created by admin" value={match.created_by_admin_id ? `Yes (#${match.created_by_admin_id})` : 'No'} />
            <Field label="Messages exchanged" value={match.engagement?.message_count ?? '-'} />
            <Field label="Dormant" value={match.engagement?.dormant ? 'Yes' : match.engagement?.dormant === false ? 'No' : '-'} />
          </div>

          {match.creation_note && (
            <div className="panel" style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
              <p className="panel-label">Manual match note</p>
              <p style={{ color: 'var(--paper)', fontSize: '0.9rem' }}>{match.creation_note}</p>
            </div>
          )}

          <div className="panel" style={{ textAlign: 'left' }}>
            <p className="panel-label">Outcome (bounty-evidence trail)</p>

            {!canRecordOutcome ? (
              <div>
                <p style={{ color: 'var(--paper)', fontSize: '0.9rem' }}>
                  {match.outcome_status ? match.outcome_status.replace(/_/g, ' ') : 'Not yet recorded.'}
                </p>
                {match.outcome_notes && <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{match.outcome_notes}</p>}
                <p style={{ color: 'var(--muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  Recording an outcome requires Moderator or higher.
                </p>
              </div>
            ) : (
              <form onSubmit={submitOutcome}>
                <select
                  value={outcomeStatus}
                  onChange={(e) => setOutcomeStatus(e.target.value)}
                  style={{ width: '100%', marginBottom: '0.6rem', background: 'var(--ink-line)', border: '1px solid var(--ink-line-strong)', color: 'var(--paper)', borderRadius: '8px', padding: '0.55rem 0.7rem' }}
                >
                  <option value="">Select an outcome...</option>
                  {OUTCOMES.map((o) => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
                </select>
                <textarea
                  placeholder="Notes (optional)"
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  rows={3}
                  style={{ width: '100%', marginBottom: '0.6rem', background: 'var(--ink-line)', border: '1px solid var(--ink-line-strong)', color: 'var(--paper)', borderRadius: '8px', padding: '0.55rem 0.7rem', resize: 'vertical', boxSizing: 'border-box' }}
                />
                <button type="submit" className="btn-primary btn-sm" disabled={saving || !outcomeStatus}>
                  {saving ? 'Saving...' : 'Record outcome'}
                </button>
                {saveError && <p style={{ color: 'var(--warn)', fontSize: '0.82rem', marginTop: '0.5rem' }}>{saveError}</p>}
              </form>
            )}
          </div>
        </>
      )}
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
