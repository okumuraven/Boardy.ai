import { useState } from 'react';
import { apiFetch } from '../../lib/api';
import { useAdminList } from '../useAdminList';
import AdminPagination from '../AdminPagination';

// Moderator+ post a discussion topic to the member-facing feed - unlike
// AnnouncementsView, this never emails anyone: it's an async, browse-at-
// your-own-pace prompt (a Wisdom-Wednesday-style nudge), not a push.
// Support tier gets read-only visibility into past topics only.
export default function DiscussionTopicsView({ admin }) {
  const canPost = admin && ['moderator', 'superadmin'].includes(admin.admin_role);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const [postResult, setPostResult] = useState('');

  const { items, page, setPage, total_pages, total_count, loading, error, reload } = useAdminList(
    '/api/admin/discussion_topics',
    {},
    'topics',
  );

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setPosting(true);
    setPostError('');
    setPostResult('');
    try {
      const res = await apiFetch('/api/admin/discussion_topics', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      const responseBody = await res.json();
      if (!res.ok) throw new Error(responseBody.error || 'Post failed');
      setPostResult('Posted - members will see this in their Discussion feed.');
      setTitle('');
      setBody('');
      reload();
    } catch (err) {
      setPostError(err.message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div>
      {canPost && (
        <div className="panel" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
          <p className="panel-label">Post a discussion topic</p>
          <form onSubmit={submit}>
            <input
              type="text"
              placeholder="Title (e.g. 'What's the hardest part of hiring right now?')"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: '100%', marginBottom: '0.6rem', background: 'var(--ink-line)', border: '1px solid var(--ink-line-strong)', color: 'var(--paper)', borderRadius: '8px', padding: '0.55rem 0.7rem', boxSizing: 'border-box' }}
            />
            <textarea
              placeholder="Give members something to think about or share."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              style={{ width: '100%', marginBottom: '0.75rem', background: 'var(--ink-line)', border: '1px solid var(--ink-line-strong)', color: 'var(--paper)', borderRadius: '8px', padding: '0.55rem 0.7rem', resize: 'vertical', boxSizing: 'border-box' }}
            />
            <button type="submit" className="btn-primary btn-sm" disabled={posting || !title.trim() || !body.trim()}>
              {posting ? 'Posting...' : 'Post to Discussion feed'}
            </button>
          </form>
          {postError && <p style={{ color: 'var(--warn)', fontSize: '0.82rem', marginTop: '0.5rem' }}>{postError}</p>}
          {postResult && <p style={{ color: 'var(--signal)', fontSize: '0.82rem', marginTop: '0.5rem' }}>{postResult}</p>}
        </div>
      )}

      {loading && <div className="admin-empty-state">Loading topics...</div>}
      {error && <div className="admin-empty-state">{error}</div>}

      {!loading && !error && (
        <>
          {items.length === 0 ? (
            <div className="admin-empty-state">No topics posted yet.</div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Body</th>
                    <th>Posted by</th>
                    <th>Posted</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((t) => (
                    <tr key={t.id}>
                      <td>{t.title}</td>
                      <td>{t.body}</td>
                      <td>{t.posted_by || '-'}</td>
                      <td>{new Date(t.inserted_at).toLocaleDateString()}</td>
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
