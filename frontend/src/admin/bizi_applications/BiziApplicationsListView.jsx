import { useAdminList } from '../useAdminList';
import AdminPagination from '../AdminPagination';

// Closes the loop on the notification Vokazi.Bizi already sends every
// active Superadmin on submit - previously that notification had
// nowhere to lead (bizi_flow.md's original scope deliberately excluded
// a review screen; added once the gap became obvious in practice).
export default function BiziApplicationsListView({ onSelect }) {
  const { items, page, setPage, total_pages, total_count, loading, error } = useAdminList(
    '/api/admin/bizi_applications',
    {},
    'applications',
  );

  return (
    <div>
      {loading && <div className="admin-empty-state">Loading applications...</div>}
      {error && <div className="admin-empty-state">{error}</div>}

      {!loading && !error && (
        <>
          {items.length === 0 ? (
            <div className="admin-empty-state">No Bizi applications submitted yet.</div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Applicant</th>
                    <th>Track(s)</th>
                    <th>Batch</th>
                    <th>Status</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((a) => (
                    <tr key={a.id} onClick={() => onSelect(a.id)} style={{ cursor: 'pointer' }}>
                      <td>{a.company_name}</td>
                      <td>{a.applicant?.name || a.applicant?.email || '?'}</td>
                      <td>{(a.track || []).join(', ')}</td>
                      <td>{a.batch_target || <span style={{ color: 'var(--muted)' }}>-</span>}</td>
                      <td>{a.status}</td>
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
