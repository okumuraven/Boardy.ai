import { useState } from 'react';
import { apiFetch } from '../../lib/api';
import { useAdminList } from '../useAdminList';
import AdminPagination from '../AdminPagination';
import MemberPicker from './MemberPicker';

// Bizi Buddy System (kuzana_playbook.md §6) - Moderator+ pairs two
// members as accountability buddies; the pairing reuses the existing
// Match+Chat infrastructure server-side, so it shows up in the pair's
// normal chat like any other unlocked match. See "things to add.md" #2.
export default function BuddyPairingsView({ admin }) {
  const canCreate = admin && ['moderator', 'superadmin'].includes(admin.admin_role);

  const [memberA, setMemberA] = useState(null);
  const [memberB, setMemberB] = useState(null);
  const [note, setNote] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createResult, setCreateResult] = useState('');

  const { items, page, setPage, total_pages, total_count, loading, error, reload } = useAdminList(
    '/api/admin/buddy_pairings',
    {},
    'pairings',
  );

  const submitPairing = async (e) => {
    e.preventDefault();
    if (!memberA || !memberB) return;
    setCreating(true);
    setCreateError('');
    setCreateResult('');
    try {
      const res = await apiFetch('/api/admin/buddy_pairings', {
        method: 'POST',
        body: JSON.stringify({ user_a_id: memberA.id, user_b_id: memberB.id, creation_note: note.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Pairing failed');
      setCreateResult(`Paired ${memberA.full_name || memberA.email} with ${memberB.full_name || memberB.email} - chat is open.`);
      setMemberA(null);
      setMemberB(null);
      setNote('');
      reload();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      {canCreate && (
        <div className="panel" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
          <p className="panel-label">Pair two members as accountability buddies</p>
          <form onSubmit={submitPairing}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <MemberPicker label="Buddy 1" selected={memberA} onSelect={setMemberA} />
              <MemberPicker label="Buddy 2" selected={memberB} onSelect={setMemberB} />
            </div>
            <textarea
              placeholder="Why these two? (optional note)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              style={{ width: '100%', marginBottom: '0.75rem', background: 'var(--ink-line)', border: '1px solid var(--ink-line-strong)', color: 'var(--paper)', borderRadius: '8px', padding: '0.55rem 0.7rem', resize: 'vertical', boxSizing: 'border-box' }}
            />
            <button type="submit" className="btn-primary btn-sm" disabled={creating || !memberA || !memberB}>
              {creating ? 'Pairing...' : 'Create pairing'}
            </button>
          </form>
          <p style={{ color: 'var(--muted)', fontSize: '0.8rem', marginTop: '0.6rem' }}>
            Blocked if they're at the same company, or their batches don't match.
          </p>
          {createError && <p style={{ color: 'var(--warn)', fontSize: '0.82rem', marginTop: '0.5rem' }}>{createError}</p>}
          {createResult && <p style={{ color: 'var(--signal)', fontSize: '0.82rem', marginTop: '0.5rem' }}>{createResult}</p>}
        </div>
      )}

      {loading && <div className="admin-empty-state">Loading pairings...</div>}
      {error && <div className="admin-empty-state">{error}</div>}

      {!loading && !error && (
        <>
          {items.length === 0 ? (
            <div className="admin-empty-state">No buddy pairings yet.</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Pair</th>
                  <th>Batch</th>
                  <th>Note</th>
                  <th>Paired</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td>{p.user_a?.name || '?'} &harr; {p.user_b?.name || '?'}</td>
                    <td>{p.user_a?.batch || '-'}</td>
                    <td>{p.creation_note || '-'}</td>
                    <td>{new Date(p.inserted_at).toLocaleDateString()}</td>
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
