import { useAdminList } from '../useAdminList';
import AdminPagination from '../AdminPagination';

// Read-only browsing of member feedback (rating + optional message) -
// see "things to add.md" for why this exists in-app rather than an
// external form (user feedback is one of the hackathon's own judging
// criteria, and this ties every submission to a real signed-in tester).
export default function FeedbackListView() {
  const { items, page, setPage, total_pages, total_count, loading, error } = useAdminList(
    '/api/admin/feedback',
    {},
    'submissions',
  );

  return (
    <div>
      {loading && <div className="admin-empty-state">Loading feedback...</div>}
      {error && <div className="admin-empty-state">{error}</div>}

      {!loading && !error && (
        <>
          {items.length === 0 ? (
            <div className="admin-empty-state">No feedback submitted yet.</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Rating</th>
                  <th>Message</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {items.map((f) => (
                  <tr key={f.id}>
                    <td>{f.user?.name || f.user?.email || '?'}</td>
                    <td>{'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}</td>
                    <td>{f.message || <span style={{ color: 'var(--muted)' }}>-</span>}</td>
                    <td>{new Date(f.inserted_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <AdminPagination page={page} totalPages={total_pages} totalCount={total_count} onChange={setPage} />
        </>
      )}
    </div>
  );
}
