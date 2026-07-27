import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';

const ROLES = ['support', 'moderator', 'superadmin'];

// Superadmin-only (AdminShell only renders this tab for that tier, and
// every mutation here is re-checked server-side regardless - see
// "Admin panel.md" §4/§6).
export default function AdminAccountsView({ admin }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('support');
  const [inviteError, setInviteError] = useState('');
  const [inviteResult, setInviteResult] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = () => {
    setError('');
    apiFetch('/api/admin/admins')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError("Couldn't load admin accounts."));
  };

  useEffect(load, []);

  const submitInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError('');
    setInviteResult(null);
    try {
      const res = await apiFetch('/api/admin/admins/invite', {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail.trim(), admin_role: inviteRole }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Invite failed');
      setInviteResult(body);
      setInviteEmail('');
      load();
    } catch (err) {
      setInviteError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const copyLink = (link) => navigator.clipboard.writeText(link);

  const doAction = async (path) => {
    setActionError('');
    try {
      const res = await apiFetch(`/api/admin/admins/${path}`, { method: 'PATCH' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Action failed');
      load();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const revokeInvite = async (id) => {
    setActionError('');
    try {
      const res = await apiFetch(`/api/admin/admins/invites/${id}`, { method: 'DELETE' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Revoke failed');
      load();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const changeRole = async (id, role) => {
    setActionError('');
    try {
      const res = await apiFetch(`/api/admin/admins/${id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ admin_role: role }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Role change failed');
      load();
    } catch (err) {
      setActionError(err.message);
    }
  };

  if (error) return <div className="admin-empty-state">{error}</div>;
  if (!data) return <div className="admin-empty-state">Loading...</div>;

  return (
    <div>
      <div className="panel" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
        <p className="panel-label">Invite a new admin</p>
        <form onSubmit={submitInvite} style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="email"
            placeholder="name@kuzana.co"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            style={{ flex: '1 1 220px', background: 'var(--ink-line)', border: '1px solid var(--ink-line-strong)', color: 'var(--paper)', borderRadius: '8px', padding: '0.55rem 0.7rem' }}
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            style={{ background: 'var(--ink-line)', border: '1px solid var(--ink-line-strong)', color: 'var(--paper)', borderRadius: '8px', padding: '0.55rem 0.7rem' }}
          >
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button type="submit" className="btn-primary btn-sm" disabled={inviting || !inviteEmail.trim()}>
            {inviting ? 'Inviting...' : 'Invite'}
          </button>
        </form>
        <p style={{ color: 'var(--muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
          Emails them a link that expires in 48 hours and only works with that exact Google account - no member onboarding runs for them.
        </p>
        {inviteError && <p style={{ color: 'var(--warn)', fontSize: '0.82rem', marginTop: '0.5rem' }}>{inviteError}</p>}
        {inviteResult && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.82rem' }}>
            {inviteResult.email_status === 'sent' ? (
              <p style={{ color: 'var(--signal)' }}>Invite emailed to {inviteResult.email}.</p>
            ) : (
              <p style={{ color: 'var(--warn)' }}>Invite created, but the email failed to send - copy the link and share it manually.</p>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <code style={{ color: 'var(--muted)', wordBreak: 'break-all' }}>{inviteResult.link}</code>
              <button type="button" className="btn-ghost btn-sm" onClick={() => copyLink(inviteResult.link)}>Copy</button>
            </div>
          </div>
        )}
      </div>

      {actionError && <p style={{ color: 'var(--warn)', fontSize: '0.85rem', marginBottom: '1rem' }}>{actionError}</p>}

      <table className="admin-table" style={{ marginBottom: '1.5rem' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data.admins.map((a) => {
            const isSelf = a.id === admin.id;
            return (
              <tr key={a.id}>
                <td>{a.full_name || '-'}</td>
                <td>{a.email}</td>
                <td>
                  <select
                    value={a.admin_role}
                    disabled={isSelf}
                    onChange={(e) => changeRole(a.id, e.target.value)}
                    style={{ background: 'var(--ink-line)', border: '1px solid var(--ink-line-strong)', color: 'var(--paper)', borderRadius: '6px', padding: '0.3rem 0.5rem', fontSize: '0.82rem' }}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td>
                  <span className={`admin-pill ${a.admin_status === 'active' ? 'signal' : 'warn'}`}>{a.admin_status}</span>
                </td>
                <td>
                  {isSelf ? (
                    <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>(you)</span>
                  ) : a.admin_status === 'active' ? (
                    <button className="btn-ghost btn-sm" onClick={() => doAction(`${a.id}/suspend`)}>Suspend</button>
                  ) : (
                    <button className="btn-ghost btn-sm" onClick={() => doAction(`${a.id}/reactivate`)}>Reactivate</button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {data.pending_invites.length > 0 && (
        <>
          <p className="admin-detail-field-label" style={{ marginBottom: '0.5rem' }}>Pending invites (not yet signed in)</p>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Expires</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.pending_invites.map((i) => (
                <tr key={i.id}>
                  <td>{i.email}</td>
                  <td>{i.admin_role}</td>
                  <td>
                    {i.expired ? (
                      <span className="admin-pill warn">expired</span>
                    ) : (
                      new Date(i.expires_at).toLocaleString()
                    )}
                  </td>
                  <td style={{ display: 'flex', gap: '0.4rem' }}>
                    <button className="btn-ghost btn-sm" onClick={() => copyLink(i.link)}>Copy link</button>
                    <button className="btn-ghost btn-sm" onClick={() => revokeInvite(i.id)}>Revoke</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
