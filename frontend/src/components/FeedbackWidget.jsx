import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

// Global floating feedback prompt - visible anywhere in the signed-in
// app (mounted once in AppShell). Hides itself once a member has
// submitted feedback, and reappears if staff send a new feature
// announcement in the meantime - see Vokazi.Feedback.should_show_widget?/1
// on the backend, which is the actual source of truth; this component
// just reflects whatever that endpoint says.
export default function FeedbackWidget() {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    apiFetch('/api/feedback/status')
      .then((res) => res.json())
      .then((data) => setVisible(!!data.show))
      .catch(() => {});
  }, []);

  if (!visible) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return;
    setSending(true);
    setError('');
    try {
      const res = await apiFetch('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({ rating, message: message.trim() || null }),
      });
      if (!res.ok) throw new Error('failed');
      setSent(true);
      setVisible(false);
    } catch {
      setError("Couldn't send this. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="btn-primary btn-sm"
          style={{ position: 'fixed', right: '1.25rem', bottom: '1.25rem', zIndex: 90, borderRadius: '999px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}
        >
          Feedback
        </button>
      )}

      {open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 95, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => !sending && setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--ink-raised)', border: '1px solid var(--ink-line-strong)', borderRadius: '12px', padding: '1.5rem', width: '100%', maxWidth: '380px', boxSizing: 'border-box' }}
          >
            {sent ? (
              <p style={{ color: 'var(--signal)', fontSize: '0.95rem', margin: 0 }}>Thanks - this genuinely helps us make it better.</p>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: 'var(--paper)', margin: 0 }}>How's it going?</p>
                  <button onClick={() => setOpen(false)} className="btn-ghost btn-sm">Close</button>
                </div>

                <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                  Your honest take helps us perfect Kuzana Connect - good, bad, or confusing.
                </p>

                <form onSubmit={submit}>
                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.85rem' }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRating(n)}
                        aria-label={`${n} star${n > 1 ? 's' : ''}`}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '1.6rem',
                          lineHeight: 1,
                          padding: 0,
                          color: n <= rating ? 'var(--signal)' : 'var(--ink-line-strong)',
                        }}
                      >
                        ★
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="What's working, what's not? (optional)"
                    rows={4}
                    style={{ width: '100%', marginBottom: '0.75rem', background: 'var(--ink-line)', border: '1px solid var(--ink-line-strong)', color: 'var(--paper)', borderRadius: '8px', padding: '0.6rem 0.7rem', resize: 'vertical', boxSizing: 'border-box' }}
                  />

                  <button type="submit" className="btn-primary btn-sm" disabled={sending || !rating}>
                    {sending ? 'Sending...' : 'Send feedback'}
                  </button>
                  {error && <p style={{ color: 'var(--warn)', fontSize: '0.82rem', marginTop: '0.5rem' }}>{error}</p>}
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
