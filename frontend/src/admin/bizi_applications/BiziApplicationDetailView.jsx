import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { ELIGIBILITY_GROUPS } from '../../constants/biziEligibility';

// Full detail for one Bizi application, including every eligibility
// item - the exact data Kuzana's real form collects (kuzana_website.md
// §9), not a summary of it. Read-only: staff act on this by picking up
// the phone/WhatsApp themselves (bizi_flow.md §7), not through this
// screen.
export default function BiziApplicationDetailView({ applicationId, onBack }) {
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    apiFetch(`/api/admin/bizi_applications/${applicationId}`)
      .then((res) => {
        if (res.status === 404) throw new Error('not_found');
        if (!res.ok) throw new Error('failed');
        return res.json();
      })
      .then((data) => { if (!cancelled) setApplication(data); })
      .catch((e) => { if (!cancelled) setError(e.message === 'not_found' ? 'Application not found.' : "Couldn't load this application."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [applicationId]);

  return (
    <div>
      <button className="admin-back-link" onClick={onBack}>&larr; Back to Bizi applications</button>

      {loading && <div className="admin-empty-state">Loading...</div>}
      {error && <div className="admin-empty-state">{error}</div>}

      {!loading && !error && application && (
        <>
          <h2 style={{ color: 'var(--paper)', marginBottom: '0.25rem' }}>{application.company_name}</h2>
          <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
            {application.applicant?.name || application.applicant?.email} · Submitted {new Date(application.inserted_at).toLocaleString()}
          </p>

          <div className="admin-detail-grid">
            <Field label="Preferred name" value={application.preferred_name} />
            <Field label="Other names" value={application.other_names || '-'} />
            <Field label="Email" value={application.email} />
            <Field label="WhatsApp" value={application.whatsapp} />
            <Field label="Track(s)" value={(application.track || []).join(', ') || '-'} />
            <Field label="Batch" value={application.batch_target || '-'} />
            <Field label="Heard about us" value={application.heard_about_us} />
            {application.referred_by && <Field label="Referred by" value={application.referred_by} />}
            <Field label="Status" value={application.status} />
          </div>

          <Section label="What does your business do?">
            <p>{application.business_description}</p>
          </Section>

          {application.question_for_us && (
            <Section label="Question for us">
              <p>{application.question_for_us}</p>
            </Section>
          )}

          <Section label="Eligibility checklist">
            {ELIGIBILITY_GROUPS.map((group) => (
              <div key={group.label} style={{ marginBottom: '1rem' }}>
                <p style={{ color: 'var(--brass)', fontSize: '0.76rem', fontWeight: 600, margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {group.label}
                </p>
                <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                  {group.items.map((item) => (
                    <li key={item.key} style={{ color: application.eligibility?.[item.key] ? 'var(--paper)' : 'var(--muted)', marginBottom: '0.3rem' }}>
                      {application.eligibility?.[item.key] ? '✓' : '✗'} {item.label}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Section>
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

function Section({ label, children }) {
  return (
    <div className="panel" style={{ marginBottom: '1rem', textAlign: 'left' }}>
      <p className="panel-label">{label}</p>
      <div style={{ color: 'var(--paper)', fontSize: '0.9rem' }}>{children}</div>
    </div>
  );
}
