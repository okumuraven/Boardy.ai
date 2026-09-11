import { useState, useRef, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import './ChatInterview.css';

// Text-chat alternative to VoiceInterview - same role in Dashboard's
// interview lifecycle (start → gather offer/need → hand a finished
// profile back up), just typed instead of spoken. History lives only in
// this component's state and is resent in full on every turn - there's
// no server-side conversation state, consistent with the backend only
// ever keeping the most-recent transcript.
export default function ChatInterview({ profile, onFinished, onBackToProfile }) {
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [readyToFinish, setReadyToFinish] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);
  const startedRef = useRef(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [history, sending]);

  // Grows with content up to CSS's max-height (140px, then it scrolls
  // internally) - a fixed single-row box would hide everything past the
  // first line of a real answer, exactly the kind of multi-sentence
  // reply this interview is trying to collect.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  // Kick off with the agent's own opening line rather than an empty box -
  // mirrors how the voice interview greets the member first.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    sendTurn([]);
  }, []);

  const sendTurn = async (nextHistory) => {
    setSending(true);
    setError('');
    try {
      const response = await apiFetch('/api/interview/chat/message', {
        method: 'POST',
        body: JSON.stringify({ history: nextHistory }),
      });
      if (!response.ok) throw new Error('request failed');
      const data = await response.json();
      setHistory([...nextHistory, { role: 'agent', text: data.reply }]);
      setReadyToFinish(!!data.ready_to_finish);
    } catch (err) {
      console.error('Chat interview message failed:', err);
      setError("That didn't go through - mind trying again?");
    } finally {
      setSending(false);
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || sending || finishing) return;
    const nextHistory = [...history, { role: 'user', text }];
    setHistory(nextHistory);
    setInput('');
    sendTurn(nextHistory);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFinish = async () => {
    setFinishing(true);
    setError('');
    try {
      const response = await apiFetch('/api/interview/chat/finish', {
        method: 'POST',
        body: JSON.stringify({ history }),
      });
      if (!response.ok) throw new Error('request failed');
      const data = await response.json();
      onFinished?.(data);
    } catch (err) {
      console.error('Chat interview finish failed:', err);
      setError("Couldn't wrap up the interview - mind trying again?");
      setFinishing(false);
    }
  };

  const hasUserReply = history.some((turn) => turn.role === 'user');

  return (
    <div style={{ animation: 'fadeUpIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
      {profile?.offer_text && (
        <div style={{ textAlign: 'right', marginBottom: '0.5rem' }}>
          <button onClick={onBackToProfile} className="btn-ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            ← Back to profile
          </button>
        </div>
      )}

      {finishing ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto 1rem' }}></div>
          <p style={{ color: 'var(--muted)', fontSize: '0.92rem' }}>Wrapping up your profile...</p>
        </div>
      ) : (
        <>
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.3rem', margin: '0 0 0.4rem', color: 'var(--paper)' }}>
              Chat with <span className="accent-text">Kuzana Connect</span>
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: 0 }}>
              Type naturally, like you're telling a friend what you do and what you're stuck on - private until you both agree to connect.
            </p>
          </div>

          <div className="chat-interview-messages" ref={scrollRef}>
            {history.map((turn, i) => (
              <div key={i} className={`chat-interview-bubble ${turn.role === 'user' ? 'me' : 'them'}`}>
                {turn.text}
              </div>
            ))}
            {sending && (
              <div className="chat-interview-bubble them chat-interview-typing">
                <span></span><span></span><span></span>
              </div>
            )}
          </div>

          {error && <p style={{ color: 'var(--warn)', fontSize: '0.85rem', margin: '0.5rem 0' }}>{error}</p>}

          <div className="chat-interview-composer">
            <textarea
              ref={textareaRef}
              className="chat-interview-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your reply..."
              rows={1}
              disabled={sending}
            />
            <button
              className={`action-btn ${input.trim() && !sending ? 'ready' : ''}`}
              onClick={handleSend}
              disabled={!input.trim() || sending}
              aria-label="Send"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>

          {hasUserReply && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button onClick={handleFinish} className={readyToFinish ? 'btn-primary' : 'btn-ghost'} style={{ fontSize: '0.9rem' }}>
                {readyToFinish ? "Finish interview →" : "Finish anyway"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
