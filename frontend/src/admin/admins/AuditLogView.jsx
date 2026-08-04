import { useState } from 'react';
import { useAdminList } from '../useAdminList';
import AdminPagination from '../AdminPagination';

const ACTIONS = [
  'member.verify',
  'member.reveal_phone',
  'match.create',
  'match.record_outcome',
  'admin.invite',
  'admin.revoke_invite',
  'admin.accept_invite',
  'admin.set_role',
  'admin.suspend',
  'admin.reactivate',
  'bizi_application.advance_stage',
  'bizi_application.assign',
  'bizi_application.add_reference',
  'bizi_application.update_reference',
  'bizi_application.decision',
];

// Superadmin-only - the full mutation trail (§3). Reads are never
// logged here, only real decisions - see Vokazi.Admin.Admins moduledoc.
export default function AuditLogView() {
  const [action, setAction] = useState('');
  const { items, page, setPage, total_pages, total_count, loading, error } = useAdminList(
    '/api/admin/audit_logs',
    { action },
    'logs',
  );

  return (
    <div>
      <div className="admin-toolbar">
        <select value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All actions</option>
          {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {loading && <div className="admin-empty-state">Loading...</div>}
      {error && <div className="admin-empty-state">{error}</div>}

      {!loading && !error && (
        <>
          {items.length === 0 ? (
            <div className="admin-empty-state">No audit log entries yet.</div>
          ) : (
            <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {items.map((l) => (
                  <tr key={l.id}>
                    <td>{new Date(l.inserted_at).toLocaleString()}</td>
                    <td>{l.admin?.name || `#${l.admin?.id}`}</td>
                    <td>{l.action}</td>
                    <td>{l.target_type} #{l.target_id}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                      {l.reason && <div>{l.reason}</div>}
                      {l.metadata && Object.keys(l.metadata).length > 0 && (
                        <div>{Object.entries(l.metadata).map(([k, v]) => `${k}: ${v}`).join(', ')}</div>
                      )}
                    </td>
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
