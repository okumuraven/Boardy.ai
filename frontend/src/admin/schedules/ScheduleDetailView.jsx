import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';

const STATUS_VARIANT = { confirmed: 'signal', declined: 'warn' };

export default function ScheduleDetailView({ scheduleId, onBack }) {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    apiFetch(`/api/admin/schedules/${scheduleId}`)
      .then((res) => {
        if (res.status === 404) throw new Error('not_found');
        if (!res.ok) throw new Error('failed');
        return res.json();
      })
      .then((data) => { if (!cancelled) setSchedule(data); })
      .catch((e) => { if (!cancelled) setError(e.message === 'not_found' ? 'Schedule not found.' : "Couldn't load this schedule."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [scheduleId]);

  return (
    <div>
      <button className="admin-back-link" onClick={onBack}>&larr; Back to schedules</button>

      {loading && <div className="admin-empty-state">Loading...</div>}
      {error && <div className="admin-empty-state">{error}</div>}

      {!loading && !error && schedule && (
        <>
          <h2 style={{ color: 'var(--paper)', marginBottom: '1rem' }}>
            {schedule.user_a?.name || '?'} &harr; {schedule.user_b?.name || '?'}
          </h2>

          <div className="admin-detail-grid">
            <Field label="Status" value={<span className={`admin-pill ${STATUS_VARIANT[schedule.status] || ''}`}>{schedule.status.replace(/_/g, ' ')}</span>} />
            <Field label="Stuck" value={<span className={`admin-pill ${schedule.stuck ? 'warn' : 'signal'}`}>{schedule.stuck ? 'Yes' : 'No'}</span>} />
            <Field label="Updated" value={new Date(schedule.updated_at).toLocaleString()} />
          </div>

          {'credential_health' in schedule && (
            <div className="panel" style={{ marginBottom: '1rem', textAlign: 'left' }}>
              <p className="panel-label">Calendar credential health</p>
              <div className="admin-detail-grid">
                <CredentialField label={schedule.user_a?.name || 'User A'} health={schedule.credential_health?.user_a} />
                <CredentialField label={schedule.user_b?.name || 'User B'} health={schedule.credential_health?.user_b} />
              </div>
            </div>
          )}

          {'agenda_summary_a' in schedule && (schedule.agenda_summary_a || schedule.agenda_summary_b) && (
            <div className="panel" style={{ marginBottom: '1rem', textAlign: 'left' }}>
              <p className="panel-label">Briefing content</p>
              {schedule.agenda_summary_a && <BriefingBlock label={schedule.user_a?.name} raw={schedule.agenda_summary_a} />}
              {schedule.agenda_summary_b && <BriefingBlock label={schedule.user_b?.name} raw={schedule.agenda_summary_b} />}
            </div>
          )}

          {'confirmed_start' in schedule && schedule.confirmed_start && (
            <div className="admin-detail-grid">
              <Field label="Confirmed start" value={new Date(schedule.confirmed_start).toLocaleString()} />
              <Field label="Confirmed end" value={new Date(schedule.confirmed_end).toLocaleString()} />
              {schedule.google_meet_link && <Field label="Meet link" value={schedule.google_meet_link} />}
            </div>
          )}

          {!('credential_health' in schedule) && (
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
              Briefing content and Calendar credential health are visible to Moderator+ staff only.
            </p>
          )}
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

function CredentialField({ label, health }) {
  let text = 'Not connected';
  if (health?.connected) text = health.expired ? 'Connected (expired)' : 'Connected';
  return <Field label={label} value={text} />;
}

function BriefingBlock({ label, raw }) {
  let summary = raw;
  try {
    const parsed = JSON.parse(raw);
    summary = parsed.summary || raw;
  } catch {
    // stored as plain text on older rows - render as-is
  }
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div className="admin-detail-field-label">{label}</div>
      <p style={{ color: 'var(--paper)', fontSize: '0.88rem', margin: 0 }}>{summary}</p>
    </div>
  );
}
