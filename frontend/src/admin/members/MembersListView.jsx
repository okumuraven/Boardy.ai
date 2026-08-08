import { useState } from 'react';
import { useAdminList } from '../useAdminList';
import AdminPagination from '../AdminPagination';
import { ROLES, roleTitle } from '../../constants/roles';

export default function MembersListView({ onSelect }) {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [stuckOnly, setStuckOnly] = useState(false);
  const { items, page, setPage, total_pages, total_count, loading, error } = useAdminList(
    '/api/admin/members',
    { search, role, stuck: stuckOnly ? 'true' : '' },
    'members',
  );

  return (
    <div>
      <div className="admin-toolbar">
        <input
          type="text"
          placeholder="Search name, email, company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{roleTitle(r)}</option>
          ))}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
          <input type="checkbox" checked={stuckOnly} onChange={(e) => setStuckOnly(e.target.checked)} />
          Stuck in onboarding
        </label>
      </div>

      {loading && <div className="admin-empty-state">Loading members...</div>}
      {error && <div className="admin-empty-state">{error}</div>}

      {!loading && !error && (
        <>
          {items.length === 0 ? (
            <div className="admin-empty-state">No members match this filter.</div>
          ) : (
            <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Company</th>
                  <th>Batch</th>
                  <th>Onboarded</th>
                  <th>Interview</th>
                  <th>Verified</th>
                </tr>
              </thead>
              <tbody>
                {items.map((m) => (
                  <tr key={m.id} className="clickable" onClick={() => onSelect(m.id)}>
                    <td>{m.full_name || m.email}</td>
                    <td>{m.role || '-'}</td>
                    <td>{m.company || '-'}</td>
                    <td>{m.batch || '-'}</td>
                    <td><span className={`admin-pill ${m.onboarding_completed ? 'signal' : 'muted'}`}>{m.onboarding_completed ? 'Yes' : 'No'}</span></td>
                    <td><span className={`admin-pill ${m.has_completed_interview ? 'signal' : 'muted'}`}>{m.has_completed_interview ? 'Yes' : 'No'}</span></td>
                    <td><span className={`admin-pill ${m.is_verified ? 'signal' : 'muted'}`}>{m.is_verified ? 'Yes' : 'Not verified'}</span></td>
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
