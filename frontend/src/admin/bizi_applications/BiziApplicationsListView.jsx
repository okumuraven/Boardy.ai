import { useAdminList } from '../useAdminList';
import AdminPagination from '../AdminPagination';
import { biziStatusLabel } from '../../constants/biziStatuses';

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
                    <th>Status</th>
                    <th>Assigned to</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((a) => (
                    <tr key={a.id} onClick={() => onSelect(a.id)} style={{ cursor: 'pointer' }}>
                      <td>{a.company_name}</td>
                      <td>{a.applicant?.name || a.applicant?.email || '?'}</td>
                      <td>{(a.track || []).join(', ')}</td>
                      <td>
                        <span className="admin-pill">{biziStatusLabel(a.status)}</span>
                        {a.stuck && <span className="admin-pill warn" style={{ marginLeft: '0.4rem' }}>Stuck</span>}
                      </td>
                      <td>{a.assigned_to?.name || <span style={{ color: 'var(--muted)' }}>Unassigned</span>}</td>
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
