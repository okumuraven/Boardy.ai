import { useState } from 'react';
import { apiFetch } from '../../lib/api';

// Bizi Buddy System early-warning flag (kuzana_playbook.md §6) - only
// ever visible to Moderator+ staff, never the other buddy, matching
// the Playbook's own confidentiality rule.
export default function FlagConcernPanel({ matchId, onClose }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setError('');
    try {
      const res = await apiFetch(`/api/matches/${matchId}/flag_concern`, {
        method: 'POST',
        body: JSON.stringify({ message: message.trim() }),
      });
      if (!res.ok) throw new Error('failed');
      setSent(true);
    } catch {
      setError("Couldn't send this. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: 'var(--paper)', margin: 0 }}>Flag a concern</p>
        <button onClick={onClose} className="btn-ghost btn-sm">Close</button>
      </div>

      {sent ? (
        <p style={{ color: 'var(--signal)', fontSize: '0.9rem' }}>
          Sent to the Kuzana team - only staff can see this, never your buddy.
        </p>
      ) : (
        <>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
            If something feels off with this pairing, let the Kuzana team know privately - your buddy won't see this.
          </p>
          <form onSubmit={submit}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What's going on?"
              rows={5}
              style={{ width: '100%', marginBottom: '0.75rem', background: 'var(--ink-line)', border: '1px solid var(--ink-line-strong)', color: 'var(--paper)', borderRadius: '8px', padding: '0.6rem 0.7rem', resize: 'vertical', boxSizing: 'border-box' }}
            />
            <button type="submit" className="btn-primary btn-sm" disabled={sending || !message.trim()}>
              {sending ? 'Sending...' : 'Send to Kuzana team'}
            </button>
            {error && <p style={{ color: 'var(--warn)', fontSize: '0.82rem', marginTop: '0.5rem' }}>{error}</p>}
          </form>
        </>
      )}
    </div>
  );
}
