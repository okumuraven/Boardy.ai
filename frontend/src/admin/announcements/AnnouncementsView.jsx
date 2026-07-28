import { useState } from 'react';
import { apiFetch } from '../../lib/api';
import { useAdminList } from '../useAdminList';
import AdminPagination from '../AdminPagination';

// Moderator+ compose/send a feature announcement to every member with
// an email on file - also re-surfaces the feedback widget for anyone
// who'd already hidden it (see Vokazi.Feedback.should_show_widget?/1).
// Support tier gets read-only visibility into past announcements only.
export default function AnnouncementsView({ admin }) {
  const canSend = admin && ['moderator', 'superadmin'].includes(admin.admin_role);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendResult, setSendResult] = useState('');

  const { items, page, setPage, total_pages, total_count, loading, error, reload } = useAdminList(
    '/api/admin/feature_announcements',
    {},
    'announcements',
  );

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    setSendError('');
    setSendResult('');
    try {
      const res = await apiFetch('/api/admin/feature_announcements', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), message: message.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Send failed');
      setSendResult('Sent - every member with an email on file will get this.');
      setTitle('');
      setMessage('');
      reload();
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      {canSend && (
        <div className="panel" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
          <p className="panel-label">Announce a new feature</p>
          <form onSubmit={submit}>
            <input
              type="text"
              placeholder="Title (e.g. 'Directory search is live')"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: '100%', marginBottom: '0.6rem', background: 'var(--ink-line)', border: '1px solid var(--ink-line-strong)', color: 'var(--paper)', borderRadius: '8px', padding: '0.55rem 0.7rem', boxSizing: 'border-box' }}
            />
            <textarea
              placeholder="What's new, and what should they go try?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              style={{ width: '100%', marginBottom: '0.75rem', background: 'var(--ink-line)', border: '1px solid var(--ink-line-strong)', color: 'var(--paper)', borderRadius: '8px', padding: '0.55rem 0.7rem', resize: 'vertical', boxSizing: 'border-box' }}
            />
            <button type="submit" className="btn-primary btn-sm" disabled={sending || !title.trim() || !message.trim()}>
              {sending ? 'Sending...' : 'Send to every member'}
            </button>
          </form>
          {sendError && <p style={{ color: 'var(--warn)', fontSize: '0.82rem', marginTop: '0.5rem' }}>{sendError}</p>}
          {sendResult && <p style={{ color: 'var(--signal)', fontSize: '0.82rem', marginTop: '0.5rem' }}>{sendResult}</p>}
        </div>
      )}

      {loading && <div className="admin-empty-state">Loading announcements...</div>}
      {error && <div className="admin-empty-state">{error}</div>}

      {!loading && !error && (
        <>
          {items.length === 0 ? (
            <div className="admin-empty-state">No announcements sent yet.</div>
          ) : (
            <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Message</th>
                  <th>Sent</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id}>
                    <td>{a.title}</td>
                    <td>{a.message}</td>
                    <td>{new Date(a.inserted_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
          <AdminPagination page={page} totalPages={total_pages} totalCount={total_count} onChange={setPage} />
        </>
      )}
    </div>
  );
}
