import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { roleTitle } from '../../constants/roles';

// The phone NUMBER never appears in the initial fetch below - the
// backend deliberately excludes it (Tier 4, "never shared" per
// kuzana_playbook.md §10 - see Vokazi.Admin.Members moduledoc). Only
// `member.phone_confirmed` (a boolean, not the number) comes with it.

// wa.me needs the full number, digits only, no leading 0 or "+" -
// covers both stored shapes Profile.changeset/2 accepts (0712345678 /
// +254712345678). Only ever called with a phone_confirmed number - see
// the render gate below - so a mistyped/guessed digit string never
// reaches this.
function whatsappReminderLink(phoneNumber, fullName) {
  const digits = phoneNumber.replace(/\D/g, '').replace(/^0/, '254');
  const firstName = (fullName || '').trim().split(' ')[0] || 'there';
  const message = `Hi ${firstName}, it's the Kuzana Connect team - you haven't finished your voice interview yet, it's the one thing standing between you and your first introduction. Got a few minutes today? https://www.kuzanaconnect.tech`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export default function MemberDetailView({ memberId, admin, onBack }) {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [revealedPhone, setRevealedPhone] = useState(null);
  const [revealing, setRevealing] = useState(false);
  const [revealError, setRevealError] = useState('');
  const [confirmingPhone, setConfirmingPhone] = useState(false);
  const [confirmPhoneError, setConfirmPhoneError] = useState('');
  const [batchInput, setBatchInput] = useState('');
  const [savingBatch, setSavingBatch] = useState(false);
  const [batchError, setBatchError] = useState('');

  const canVerify = admin && ['moderator', 'superadmin'].includes(admin.admin_role);
  const canRevealPhone = canVerify;
  const canSetBatch = canVerify;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    apiFetch(`/api/admin/members/${memberId}`)
      .then((res) => {
        if (res.status === 404) throw new Error('not_found');
        if (!res.ok) throw new Error('failed');
        return res.json();
      })
      .then((data) => { if (!cancelled) { setMember(data); setBatchInput(data.batch || ''); } })
      .catch((e) => { if (!cancelled) setError(e.message === 'not_found' ? 'Member not found.' : "Couldn't load this member."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [memberId]);

  const toggleVerified = async () => {
    setVerifying(true);
    setVerifyError('');
    try {
      const res = await apiFetch(`/api/admin/members/${memberId}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ is_verified: !member.is_verified }),
      });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setMember((prev) => ({ ...prev, is_verified: data.is_verified }));
    } catch {
      setVerifyError("Couldn't update verification status.");
    } finally {
      setVerifying(false);
    }
  };

  const saveBatch = async () => {
    setSavingBatch(true);
    setBatchError('');
    try {
      const res = await apiFetch(`/api/admin/members/${memberId}/batch`, {
        method: 'PATCH',
        body: JSON.stringify({ batch: batchInput.trim() }),
      });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setMember((prev) => ({ ...prev, batch: data.batch }));
    } catch {
      setBatchError("Couldn't save the batch.");
    } finally {
      setSavingBatch(false);
    }
  };

  const revealPhone = async () => {
    setRevealing(true);
    setRevealError('');
    try {
      const res = await apiFetch(`/api/admin/members/${memberId}/reveal_phone`, { method: 'POST' });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setRevealedPhone(data.phone_number || 'Not on file');
    } catch {
      setRevealError("Couldn't reveal the phone number.");
    } finally {
      setRevealing(false);
    }
  };

  const togglePhoneConfirmed = async () => {
    setConfirmingPhone(true);
    setConfirmPhoneError('');
    try {
      const res = await apiFetch(`/api/admin/members/${memberId}/confirm_phone`, {
        method: 'PATCH',
        body: JSON.stringify({ phone_confirmed: !member.phone_confirmed }),
      });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setMember((prev) => ({ ...prev, phone_confirmed: data.phone_confirmed }));
    } catch {
      setConfirmPhoneError("Couldn't update phone confirmation.");
    } finally {
      setConfirmingPhone(false);
    }
  };

  return (
    <div>
      <button className="admin-back-link" onClick={onBack}>&larr; Back to members</button>

      {loading && <div className="admin-empty-state">Loading...</div>}
      {error && <div className="admin-empty-state">{error}</div>}

      {!loading && !error && member && (
        <>
          <h2 style={{ color: 'var(--paper)', marginBottom: '0.25rem' }}>{member.full_name || member.email}</h2>
          <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>{member.email}</p>

          <div className="admin-detail-grid">
            <Field label="Role" value={member.role ? roleTitle(member.role) : '-'} />
            <Field label="Industry" value={member.industry || '-'} />
            <Field label="Company" value={member.company || '-'} />
            <Field label="Location" value={member.location || '-'} />
            <Field label="Onboarded" value={<span className={`admin-pill ${member.onboarding_completed ? 'signal' : 'muted'}`}>{member.onboarding_completed ? 'Yes' : 'No'}</span>} />
            <div>
              <div className="admin-detail-field-label">Verified</div>
              <div className="admin-detail-field-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className={`admin-pill ${member.is_verified ? 'signal' : 'muted'}`}>{member.is_verified ? 'Yes' : 'No'}</span>
                {canVerify && (
                  <button className="btn-ghost btn-sm" onClick={toggleVerified} disabled={verifying}>
                    {verifying ? '...' : member.is_verified ? 'Unverify' : 'Verify'}
                  </button>
                )}
              </div>
            </div>
            <Field label="Joined" value={new Date(member.inserted_at).toLocaleDateString()} />
            {canSetBatch ? (
              <div>
                <div className="admin-detail-field-label">Batch</div>
                <div className="admin-detail-field-value" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input
                    type="text"
                    placeholder="e.g. Jan 2025"
                    value={batchInput}
                    onChange={(e) => setBatchInput(e.target.value)}
                    style={{ width: '110px', background: 'var(--ink-line)', border: '1px solid var(--ink-line-strong)', color: 'var(--paper)', borderRadius: '6px', padding: '0.3rem 0.5rem', fontSize: '0.85rem' }}
                  />
                  {batchInput !== (member.batch || '') && (
                    <button className="btn-ghost btn-sm" onClick={saveBatch} disabled={savingBatch}>
                      {savingBatch ? '...' : 'Save'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <Field label="Batch" value={member.batch || '-'} />
            )}
            {canRevealPhone && (
              <div>
                <div className="admin-detail-field-label">Phone</div>
                <div className="admin-detail-field-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {revealedPhone !== null ? (
                    revealedPhone
                  ) : (
                    <>
                      &bull;&bull;&bull;&bull;&bull;&bull;
                      <button className="btn-ghost btn-sm" onClick={revealPhone} disabled={revealing}>
                        {revealing ? '...' : 'Reveal'}
                      </button>
                    </>
                  )}
                  <span className={`admin-pill ${member.phone_confirmed ? 'signal' : 'muted'}`}>
                    {member.phone_confirmed ? 'Confirmed reachable' : 'Unconfirmed'}
                  </span>
                  <button className="btn-ghost btn-sm" onClick={togglePhoneConfirmed} disabled={confirmingPhone}>
                    {confirmingPhone ? '...' : member.phone_confirmed ? 'Mark unconfirmed' : 'Mark confirmed'}
                  </button>
                  {member.phone_confirmed && revealedPhone && revealedPhone !== 'Not on file' && (
                    <a
                      className="btn-ghost btn-sm"
                      href={whatsappReminderLink(revealedPhone, member.full_name)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Message on WhatsApp
                    </a>
                  )}
                </div>
                {confirmPhoneError && <p style={{ color: 'var(--warn)', fontSize: '0.82rem', marginTop: '0.35rem' }}>{confirmPhoneError}</p>}
                {!member.phone_confirmed && (
                  <p style={{ color: 'var(--muted)', fontSize: '0.78rem', marginTop: '0.35rem' }}>
                    Confirm this number after reaching them to enable a WhatsApp reminder link.
                  </p>
                )}
              </div>
            )}
          </div>

          {verifyError && <p style={{ color: 'var(--warn)', fontSize: '0.82rem', marginBottom: '1rem' }}>{verifyError}</p>}
          {revealError && <p style={{ color: 'var(--warn)', fontSize: '0.82rem', marginBottom: '1rem' }}>{revealError}</p>}
          {batchError && <p style={{ color: 'var(--warn)', fontSize: '0.82rem', marginBottom: '1rem' }}>{batchError}</p>}

          {'offer_text' in member ? (
            <>
              {member.bio && (
                <Section label="Bio"><p>{member.bio}</p></Section>
              )}
              {member.offer_text && (
                <Section label="Can offer"><p>{member.offer_text}</p></Section>
              )}
              {member.need_text && (
                <Section label="Looking for"><p>{member.need_text}</p></Section>
              )}
              {member.social && (
                <Section label="Social">
                  <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--paper)' }}>
                    {member.social.github_username && <li>GitHub: {member.social.github_username}</li>}
                    {member.social.linkedin_url && <li>LinkedIn: {member.social.linkedin_url}</li>}
                    {member.social.x_url && <li>X: {member.social.x_url}</li>}
                    {member.social.portfolio_url && <li>Portfolio: {member.social.portfolio_url}</li>}
                  </ul>
                </Section>
              )}
              {member.investment && (
                <Section label="Investment profile">
                  <div className="admin-detail-grid">
                    <Field label="Business stage" value={member.investment.business_stage || '-'} />
                    <Field label="Funding sought" value={member.investment.funding_amount_sought || '-'} />
                    <Field label="Funding types" value={(member.investment.funding_types || []).join(', ') || '-'} />
                    <Field label="Check size" value={member.investment.check_size || '-'} />
                  </div>
                </Section>
              )}
            </>
          ) : (
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
              Full profile detail (offer/need text, social, investment) is visible to Moderator+ staff only.
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

function Section({ label, children }) {
  return (
    <div className="panel" style={{ marginBottom: '1rem', textAlign: 'left' }}>
      <p className="panel-label">{label}</p>
      <div style={{ color: 'var(--paper)', fontSize: '0.9rem' }}>{children}</div>
    </div>
  );
}
