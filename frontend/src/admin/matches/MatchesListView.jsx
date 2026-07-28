import { useState } from 'react';
import { useAdminList } from '../useAdminList';
import AdminPagination from '../AdminPagination';

// "pending" is a legacy value on rows created before the status set was
// tightened to pending_consent/declined/unlocked/slashed - still present
// on old data, so kept in the filter list even though new rows won't use it.
const STATUSES = ['pending_consent', 'pending', 'declined', 'unlocked', 'slashed'];
const OUTCOMES = ['confirmed_valuable', 'attempted_no_result', 'unresponsive'];

export default function MatchesListView({ onSelect }) {
  const [status, setStatus] = useState('');
  const [outcomeStatus, setOutcomeStatus] = useState('');
  const { items, page, setPage, total_pages, total_count, loading, error } = useAdminList(
    '/api/admin/matches',
    { status, outcome_status: outcomeStatus },
    'matches',
  );

  return (
    <div>
      <div className="admin-toolbar">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={outcomeStatus} onChange={(e) => setOutcomeStatus(e.target.value)}>
          <option value="">All outcomes</option>
          {OUTCOMES.map((o) => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {loading && <div className="admin-empty-state">Loading matches...</div>}
      {error && <div className="admin-empty-state">{error}</div>}

      {!loading && !error && (
        <>
          {items.length === 0 ? (
            <div className="admin-empty-state">No matches in this filter.</div>
          ) : (
            <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Pair</th>
                  <th>Status</th>
                  <th>AI Score</th>
                  <th>Messages</th>
                  <th>Outcome</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((m) => (
                  <tr key={m.id} className="clickable" onClick={() => onSelect(m.id)}>
                    <td>{m.user_a?.name || '?'} &harr; {m.user_b?.name || '?'}</td>
                    <td>{m.status}</td>
                    <td>{m.ai_score != null ? m.ai_score : '-'}</td>
                    <td>{m.message_count != null ? m.message_count : '-'}</td>
                    <td>{m.outcome_status ? m.outcome_status.replace(/_/g, ' ') : '-'}</td>
                    <td>
                      {m.dormant && <span className="admin-pill warn">dormant</span>}
                      {m.created_by_admin_id && <span className="admin-pill muted">manual</span>}
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
