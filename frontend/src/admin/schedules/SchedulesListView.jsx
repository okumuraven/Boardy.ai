import { useState } from 'react';
import { useAdminList } from '../useAdminList';
import AdminPagination from '../AdminPagination';

const STATUSES = ['awaiting_consent', 'awaiting_availability', 'slot_proposed', 'confirmed', 'declined'];

export default function SchedulesListView({ onSelect }) {
  const [status, setStatus] = useState('');
  const { items, page, setPage, total_pages, total_count, loading, error } = useAdminList(
    '/api/admin/schedules',
    { status },
    'schedules',
  );

  return (
    <div>
      <div className="admin-toolbar">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {loading && <div className="admin-empty-state">Loading schedules...</div>}
      {error && <div className="admin-empty-state">{error}</div>}

      {!loading && !error && (
        <>
          {items.length === 0 ? (
            <div className="admin-empty-state">No schedules in this filter.</div>
          ) : (
            <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Pair</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id} className="clickable" onClick={() => onSelect(s.id)}>
                    <td>{s.user_a?.name || '?'} &harr; {s.user_b?.name || '?'}</td>
                    <td>{s.status.replace(/_/g, ' ')}</td>
                    <td>{new Date(s.updated_at).toLocaleDateString()}</td>
                    <td>{s.stuck && <span className="admin-pill warn">stuck</span>}</td>
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
