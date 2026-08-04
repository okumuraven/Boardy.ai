import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { ELIGIBILITY_GROUPS } from '../../constants/biziEligibility';
import { BIZI_STATUSES, BIZI_TERMINAL_STATUSES, biziStatusLabel } from '../../constants/biziStatuses';
import { BIZI_DOCUMENT_TYPES, biziDocumentTypeLabel } from '../../constants/biziDocumentTypes';
import ChatRoomView from '../../components/ChatSystem';

const TIMELINE_ICON = {
  stage_change: '↦',
  ai_screening: '✨',
  reminder: '⏰',
  note: '🗒',
  decision: '⚖',
};

const documentTypeByAttachmentId = (documents = []) =>
  documents.reduce((map, d) => ({ ...map, [d.attachment_id]: d.document_type }), {});

const tagAttachment = async (applicationId, attachmentId, documentType, onDone) => {
  await apiFetch(`/api/admin/bizi_applications/${applicationId}/documents`, {
    method: 'POST',
    body: JSON.stringify({ message_attachment_id: attachmentId, document_type: documentType }),
  });
  onDone();
};

export default function BiziApplicationDetailView({ applicationId, admin, onBack }) {
  const [application, setApplication] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isModerator = admin && ['moderator', 'superadmin'].includes(admin.admin_role);
  const isSuperadmin = admin && admin.admin_role === 'superadmin';

  const load = () => {
    setLoading(true);
    setError('');
    apiFetch(`/api/admin/bizi_applications/${applicationId}`)
      .then((res) => {
        if (res.status === 404) throw new Error('not_found');
        if (!res.ok) throw new Error('failed');
        return res.json();
      })
      .then((data) => setApplication(data))
      .catch((e) => setError(e.message === 'not_found' ? 'Application not found.' : "Couldn't load this application."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [applicationId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isModerator) return;
    apiFetch('/api/admin/admins')
      .then((res) => res.json())
      .then((data) => setAdmins((data.admins || []).filter((a) => a.admin_status === 'active')))
      .catch(() => {});
  }, [isModerator]);

  if (loading) return <div className="admin-empty-state">Loading...</div>;
  if (error) return <div className="admin-empty-state">{error}</div>;
  if (!application) return null;

  return (
    <div>
      <button className="admin-back-link" onClick={onBack}>&larr; Back to Bizi applications</button>

      <h2 style={{ color: 'var(--paper)', marginBottom: '0.25rem' }}>{application.company_name}</h2>
      <p style={{ color: 'var(--muted)', marginBottom: '1.25rem' }}>
        {application.applicant?.name || application.applicant?.email} · Submitted {new Date(application.inserted_at).toLocaleString()}
      </p>

      <Pipeline status={application.status} />

      {application.status === 'declined' && (
        <div className="panel warn" style={{ marginBottom: '1rem', textAlign: 'left' }}>
          <p className="panel-label warn">Declined</p>
          <p style={{ color: 'var(--paper)', fontSize: '0.9rem', margin: 0 }}>
            {application.board_decision_reason || 'No reason recorded.'}
          </p>
        </div>
      )}

      {application.status === 'approved' && (
        <div className="panel" style={{ marginBottom: '1rem', textAlign: 'left', borderColor: 'var(--signal)' }}>
          <p className="panel-label" style={{ color: 'var(--signal)' }}>Approved - flagged as a verified Bizi</p>
          <p style={{ color: 'var(--paper)', fontSize: '0.9rem', margin: 0 }}>
            {application.board_decision_reason || 'No reason recorded.'}
          </p>
        </div>
      )}

      <div className="admin-detail-grid">
        <Field label="Preferred name" value={application.preferred_name} />
        <Field label="Other names" value={application.other_names || '-'} />
        <Field label="Email" value={application.email} />
        <Field label="WhatsApp" value={application.whatsapp} />
        <Field label="Track(s)" value={(application.track || []).join(', ') || '-'} />
        <Field label="Batch" value={application.batch_target || '-'} />
        <Field label="Heard about us" value={application.heard_about_us} />
        {application.referred_by && <Field label="Referred by" value={application.referred_by} />}
        <Field label="Revenue verified" value={application.revenue_verified ? 'Yes' : 'Not yet'} />
      </div>

      {isModerator && (
        <AssignControl
          application={application}
          admins={admins}
          onAssigned={(assigned_to) => setApplication((prev) => ({ ...prev, assigned_to }))}
        />
      )}
      {!isModerator && <Field label="Assigned to" value={application.assigned_to?.name || 'Unassigned'} />}

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

      <Section label={`References (${application.references?.filter((r) => r.contacted).length || 0}/${application.references?.length || 0} contacted)`}>
        <ReferenceManager
          application={application}
          isModerator={isModerator}
          onChange={load}
        />
      </Section>

      {isModerator && !BIZI_TERMINAL_STATUSES.includes(application.status) && (
        <AdvanceStagePanel application={application} onAdvanced={load} />
      )}

      {isSuperadmin && application.status === 'board_review' && (
        <DecisionPanel application={application} onDecided={load} />
      )}

      <Section label="Documents">
        <DocumentList documents={application.documents || []} />
      </Section>

      {application.chat_room_id && (
        <Section label="Verification chat">
          <div className="bizi-verification-chat">
            <ChatRoomView
              roomId={application.chat_room_id}
              matchId={null}
              profile={{ id: admin.id }}
              partnerName={application.applicant?.name || application.applicant?.email}
              attachmentActions={
                isModerator
                  ? (msg) => (
                      <TagAttachmentControl
                        taggedAs={documentTypeByAttachmentId(application.documents)[msg.attachment.id]}
                        onTag={(documentType) => tagAttachment(application.id, msg.attachment.id, documentType, load)}
                      />
                    )
                  : undefined
              }
            />
          </div>
        </Section>
      )}

      <Section label="Stage history">
        <Timeline events={application.stage_events || []} />
      </Section>
    </div>
  );
}

function Pipeline({ status }) {
  const currentIndex = BIZI_STATUSES.indexOf(status);
  const declined = status === 'declined';
  const approved = status === 'approved';

  return (
    <div className="bizi-pipeline">
      {BIZI_STATUSES.map((s, i) => {
        const stepClass = i < currentIndex || approved || (declined && i <= currentIndex) ? 'done' : i === currentIndex ? 'current' : '';
        return (
          <div key={s} className={`bizi-pipeline-step ${stepClass}`}>
            <div className="bizi-pipeline-dot">{stepClass === 'done' ? '✓' : i + 1}</div>
            <div className="bizi-pipeline-label">{biziStatusLabel(s)}</div>
          </div>
        );
      })}
      <div className={`bizi-pipeline-step ${approved ? 'done' : declined ? 'declined' : ''}`}>
        <div className="bizi-pipeline-dot">{approved ? '✓' : declined ? '✕' : BIZI_STATUSES.length + 1}</div>
        <div className="bizi-pipeline-label">{approved ? 'Approved' : declined ? 'Declined' : 'Decision'}</div>
      </div>
    </div>
  );
}

function AssignControl({ application, admins, onAssigned }) {
  const [saving, setSaving] = useState(false);

  const save = async (adminId) => {
    setSaving(true);
    try {
      const res = await apiFetch(`/api/admin/bizi_applications/${application.id}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ assigned_to_admin_id: adminId || null }),
      });
      if (res.ok) {
        const found = admins.find((a) => String(a.id) === String(adminId));
        onAssigned(found ? { id: found.id, name: found.full_name || found.email } : null);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div className="admin-detail-field-label">Assigned to</div>
      <select
        value={application.assigned_to?.id || ''}
        onChange={(e) => save(e.target.value)}
        disabled={saving}
        style={{ background: 'var(--ink-line)', border: '1px solid var(--ink-line-strong)', color: 'var(--paper)', borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.85rem', marginTop: '0.3rem' }}
      >
        <option value="">Unassigned</option>
        {admins.map((a) => (
          <option key={a.id} value={a.id}>{a.full_name || a.email}</option>
        ))}
      </select>
    </div>
  );
}

function ReferenceManager({ application, isModerator, onChange }) {
  const [form, setForm] = useState({ reference_type: 'customer', name: '', phone: '' });
  const [adding, setAdding] = useState(false);

  const addReference = async () => {
    if (!form.name.trim()) return;
    setAdding(true);
    try {
      const res = await apiFetch(`/api/admin/bizi_applications/${application.id}/references`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({ reference_type: 'customer', name: '', phone: '' });
        onChange();
      }
    } finally {
      setAdding(false);
    }
  };

  const toggle = async (referenceId, field, value) => {
    await apiFetch(`/api/admin/bizi_applications/${application.id}/references/${referenceId}`, {
      method: 'PATCH',
      body: JSON.stringify({ [field]: value }),
    });
    onChange();
  };

  const references = application.references || [];

  return (
    <div>
      {references.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No references added yet.</p>}

      {references.map((r) => (
        <div key={r.id} className="bizi-reference-row">
          <div>
            <div style={{ color: 'var(--paper)', fontSize: '0.9rem' }}>
              <span className={`admin-pill ${r.reference_type === 'customer' ? 'signal' : 'muted'}`} style={{ marginRight: '0.5rem' }}>{r.reference_type}</span>
              {r.name} {r.phone && <span style={{ color: 'var(--muted)' }}>· {r.phone}</span>}
            </div>
          </div>
          {isModerator ? (
            <div className="bizi-reference-checks">
              <label>
                <input type="checkbox" checked={!!r.contacted} onChange={(e) => toggle(r.id, 'contacted', e.target.checked)} />
                Contacted
              </label>
              <label>
                <input type="checkbox" checked={!!r.verified} onChange={(e) => toggle(r.id, 'verified', e.target.checked)} />
                Verified
              </label>
            </div>
          ) : (
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
              {r.contacted ? 'Contacted' : 'Not contacted'} · {r.verified ? 'Verified' : 'Not verified'}
            </div>
          )}
        </div>
      ))}

      {isModerator && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <select
            value={form.reference_type}
            onChange={(e) => setForm({ ...form, reference_type: e.target.value })}
            style={{ background: 'var(--ink-line)', border: '1px solid var(--ink-line-strong)', color: 'var(--paper)', borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
          >
            <option value="customer">Customer</option>
            <option value="creditor">Creditor</option>
          </select>
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={{ background: 'var(--ink-line)', border: '1px solid var(--ink-line-strong)', color: 'var(--paper)', borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.85rem', flex: 1, minWidth: '120px' }}
          />
          <input
            placeholder="Phone (optional)"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            style={{ background: 'var(--ink-line)', border: '1px solid var(--ink-line-strong)', color: 'var(--paper)', borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.85rem', flex: 1, minWidth: '120px' }}
          />
          <button className="btn-ghost btn-sm" onClick={addReference} disabled={adding || !form.name.trim()}>
            {adding ? '...' : 'Add'}
          </button>
        </div>
      )}
    </div>
  );
}

function AdvanceStagePanel({ application, onAdvanced }) {
  const currentIndex = BIZI_STATUSES.indexOf(application.status);
  const nextStatuses = BIZI_STATUSES.filter((_, i) => i !== currentIndex);
  const [status, setStatus] = useState(BIZI_STATUSES[currentIndex + 1] || BIZI_STATUSES[0]);
  const [comment, setComment] = useState('');
  const [revenueVerified, setRevenueVerified] = useState(application.revenue_verified);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const advance = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await apiFetch(`/api/admin/bizi_applications/${application.id}/stage`, {
        method: 'PATCH',
        body: JSON.stringify({ status, comment, revenue_verified: revenueVerified }),
      });
      if (!res.ok) throw new Error('failed');
      setComment('');
      onAdvanced();
    } catch {
      setError("Couldn't advance the stage.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel" style={{ marginBottom: '1rem', textAlign: 'left' }}>
      <p className="panel-label">Advance stage</p>

      {application.status === 'verification' && (
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--paper)', marginBottom: '0.75rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={revenueVerified} onChange={(e) => setRevenueVerified(e.target.checked)} />
          Revenue verified against bank statement
        </label>
      )}

      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        style={{ background: 'var(--ink-line)', border: '1px solid var(--ink-line-strong)', color: 'var(--paper)', borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.85rem', marginBottom: '0.75rem', width: '100%', boxSizing: 'border-box' }}
      >
        {nextStatuses.map((s) => (
          <option key={s} value={s}>{biziStatusLabel(s)}</option>
        ))}
        <option value="declined">Declined</option>
      </select>

      <textarea
        placeholder="Comment - staff-only, never shown to the applicant"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        style={{ background: 'var(--ink-line)', border: '1px solid var(--ink-line-strong)', color: 'var(--paper)', borderRadius: '6px', padding: '0.5rem 0.65rem', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
      />

      {error && <p style={{ color: 'var(--warn)', fontSize: '0.82rem', margin: '0.5rem 0 0' }}>{error}</p>}

      <button className="btn-primary" style={{ marginTop: '0.75rem' }} onClick={advance} disabled={saving}>
        {saving ? 'Saving...' : `Move to ${biziStatusLabel(status)}`}
      </button>
    </div>
  );
}

function DecisionPanel({ application, onDecided }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const decide = async (decision) => {
    setSaving(true);
    setError('');
    try {
      const res = await apiFetch(`/api/admin/bizi_applications/${application.id}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision, reason }),
      });
      if (!res.ok) throw new Error('failed');
      onDecided();
    } catch {
      setError("Couldn't record the decision.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel" style={{ marginBottom: '1rem', textAlign: 'left' }}>
      <p className="panel-label">Board decision</p>
      <textarea
        placeholder="Decision reason - required"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        style={{ background: 'var(--ink-line)', border: '1px solid var(--ink-line-strong)', color: 'var(--paper)', borderRadius: '6px', padding: '0.5rem 0.65rem', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
      />
      {error && <p style={{ color: 'var(--warn)', fontSize: '0.82rem', margin: '0.5rem 0 0' }}>{error}</p>}
      <div className="bizi-decision-panel">
        <button className="btn-primary decline" disabled={saving || !reason.trim()} onClick={() => decide('declined')}>
          Decline
        </button>
        <button className="btn-primary approve" disabled={saving || !reason.trim()} onClick={() => decide('approved')}>
          Approve - flag as verified Bizi
        </button>
      </div>
    </div>
  );
}

function DocumentList({ documents }) {
  if (documents.length === 0) {
    return <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No documents tagged yet - tag one from the verification chat below.</p>;
  }

  return (
    <div>
      {documents.map((d) => (
        <div key={d.id} className="bizi-reference-row">
          <div style={{ color: 'var(--paper)', fontSize: '0.9rem' }}>
            <span className="admin-pill signal" style={{ marginRight: '0.5rem' }}>{biziDocumentTypeLabel(d.document_type)}</span>
            {d.filename}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
            {d.tagged_by?.name || 'Staff'} · {new Date(d.inserted_at).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
}

// Sits inline under an applicant-sent attachment in the verification
// chat - a moderator picks the real document type Kuzana's DD process
// asks for, right where the file actually is, instead of hunting for a
// separate upload/tag screen.
function TagAttachmentControl({ taggedAs, onTag }) {
  const [type, setType] = useState(BIZI_DOCUMENT_TYPES[0]);
  const [saving, setSaving] = useState(false);

  if (taggedAs) {
    return <span className="admin-pill signal bizi-tag-badge">{biziDocumentTypeLabel(taggedAs)}</span>;
  }

  const tag = async () => {
    setSaving(true);
    try {
      await onTag(type);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bizi-tag-control">
      <select value={type} onChange={(e) => setType(e.target.value)} disabled={saving}>
        {BIZI_DOCUMENT_TYPES.map((t) => (
          <option key={t} value={t}>{biziDocumentTypeLabel(t)}</option>
        ))}
      </select>
      <button className="btn-ghost btn-sm" onClick={tag} disabled={saving}>
        {saving ? '...' : 'Tag'}
      </button>
    </div>
  );
}

function Timeline({ events }) {
  if (events.length === 0) return <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Nothing recorded yet.</p>;

  return (
    <div className="bizi-timeline">
      {events.map((e) => (
        <div key={e.id} className="bizi-timeline-item">
          <div className={`bizi-timeline-icon ${e.performed_by ? '' : 'system'} ${e.kind === 'decision' ? 'decision' : ''}`}>
            {TIMELINE_ICON[e.kind] || '•'}
          </div>
          <div className="bizi-timeline-body">
            <div className="bizi-timeline-who">
              {e.performed_by?.name || 'Automated'}
              {e.from_status && e.to_status && (
                <span className="tag"> moved {biziStatusLabel(e.from_status)} &rarr; {biziStatusLabel(e.to_status)}</span>
              )}
            </div>
            {e.comment && <div className="bizi-timeline-comment">{e.comment}</div>}
            <div className="bizi-timeline-time">{new Date(e.inserted_at).toLocaleString()}</div>
          </div>
        </div>
      ))}
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
