import { useState, useRef, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import KuzanaMark from './KuzanaMark';
import './ChatInterview.css';

// Text-chat alternative to VoiceInterview - same role in Dashboard's
// interview lifecycle (start → gather offer/need → hand a finished
// profile back up), just typed instead of spoken. History lives only in
// this component's state and is resent in full on every turn - there's
// no server-side conversation state, consistent with the backend only
// ever keeping the most-recent transcript.
export default function ChatInterview({ profile, onFinished, onBackToProfile, onProgress }) {
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [readyToFinish, setReadyToFinish] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState('');
  // The backend now bounds a reply to ~3 API-key attempts (worst case
  // ~30s) instead of working through every configured key before giving
  // up - but three attempts is still slower than the usual <2s reply, so
  // this softens the wait instead of leaving the typing dots looking
  // frozen with zero feedback.
  const [waitingLong, setWaitingLong] = useState(false);
  const scrollRef = useRef(null);
  const startedRef = useRef(false);
  const textareaRef = useRef(null);
  const waitingLongTimerRef = useRef(null);

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

  // Puts the cursor back in the box the moment a reply lands, so
  // answering feels like a real back-and-forth (type, hit enter, just
  // keep typing) instead of a click-reply-click-reply loop.
  useEffect(() => {
    if (!sending && !finishing) textareaRef.current?.focus();
  }, [sending, finishing]);

  // Kick off with the agent's own opening line rather than an empty box -
  // mirrors how the voice interview greets the member first.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    sendTurn([]);
  }, []);

  const hasUserReply = history.some((turn) => turn.role === 'user');
  const userTurnCount = history.filter((turn) => turn.role === 'user').length;
  // Backstop, not the primary mechanism - the prompt itself (Vokazi.AI.
  // chat_reply/1) already starts steering the model toward ready_to_finish
  // once the member has replied 6+ times, but that's the model's own
  // judgment call and nothing guarantees it complies. This guarantees the
  // nudge appears regardless, so a conversation can never quietly run
  // forever waiting on a model that just keeps finding more to ask.
  const MAX_TURNS_BEFORE_NUDGE = 10;
  const effectiveReadyToFinish = readyToFinish || userTurnCount >= MAX_TURNS_BEFORE_NUDGE;

  // Tells Dashboard once there's real conversation worth protecting, so
  // it can hide the Talk/Chat toggle - switching tabs mid-chat would
  // otherwise unmount this component and silently drop everything typed
  // so far, since history only ever lives here, never on the server.
  useEffect(() => {
    onProgress?.(hasUserReply);
    return () => onProgress?.(false);
  }, [hasUserReply]);

  const sendTurn = async (nextHistory) => {
    setSending(true);
    setWaitingLong(false);
    setError('');
    waitingLongTimerRef.current = setTimeout(() => setWaitingLong(true), 6000);

    // Gives up locally at 40s regardless of what the backend does - a
    // hard ceiling above its own ~30s worst case (3 key attempts x up to
    // 10s each), so a request can never leave the UI hanging forever
    // even if something between here and Gemini behaves worse than
    // expected.
    const abortController = new AbortController();
    const hardTimeout = setTimeout(() => abortController.abort(), 40000);

    try {
      const response = await apiFetch('/api/interview/chat/message', {
        method: 'POST',
        body: JSON.stringify({ history: nextHistory }),
        signal: abortController.signal,
      });
      if (!response.ok) throw new Error('request failed');
      const data = await response.json();
      setHistory([...nextHistory, { role: 'agent', text: data.reply }]);
      setReadyToFinish(!!data.ready_to_finish);
    } catch (err) {
      console.error('Chat interview message failed:', err);
      setError(
        err.name === 'AbortError'
          ? "That's taking too long - mind trying again?"
          : "That didn't go through - mind trying again?"
      );
    } finally {
      clearTimeout(waitingLongTimerRef.current);
      clearTimeout(hardTimeout);
      setWaitingLong(false);
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

  // Just kicks off the backend's async finalize pipeline and hands off to
  // Dashboard's existing poll-for-sync loop (same one voice uses) - the
  // request itself only has to wait on an ack, not on the Gemini chain
  // (extract_summary, tags, two embeddings) that actually produces the
  // finished profile.
  const handleFinish = async () => {
    setFinishing(true);
    setError('');
    try {
      const response = await apiFetch('/api/interview/chat/finish', {
        method: 'POST',
        body: JSON.stringify({ history }),
      });
      if (!response.ok) throw new Error('request failed');
      onFinished?.();
    } catch (err) {
      console.error('Chat interview finish failed:', err);
      setError("Couldn't wrap up the interview - mind trying again?");
      setFinishing(false);
    }
  };

  return (
    <div className="chat-interview-wrap" style={{ animation: 'fadeUpIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
      {profile?.offer_text && (
        <div style={{ textAlign: 'right', marginBottom: '0.5rem' }}>
          <button onClick={onBackToProfile} className="btn-ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            ← Back to profile
          </button>
        </div>
      )}

      <div className="panel chat-interview-panel">
        {finishing ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto 1rem' }}></div>
            <p style={{ color: 'var(--muted)', fontSize: '0.92rem' }}>Wrapping up your profile...</p>
          </div>
        ) : (
          <>
            <div className="chat-interview-header">
              <span className="chat-interview-header-mark"><KuzanaMark /></span>
              <div>
                <h2 className="chat-interview-title">Chat with Kuzana Connect</h2>
                <p className="chat-interview-subtitle">
                  Type naturally, like you're telling a friend what you do and what you're stuck on - private until you both agree to connect.
                </p>
              </div>
            </div>

            <div className="chat-interview-messages" ref={scrollRef}>
              {history.map((turn, i) => (
                <div key={i} className={`chat-interview-row ${turn.role === 'user' ? 'me' : 'them'}`}>
                  {turn.role === 'agent' && <span className="chat-interview-avatar"><KuzanaMark /></span>}
                  <div className="chat-interview-bubble">{turn.text}</div>
                </div>
              ))}
              {sending && (
                <div className="chat-interview-row them">
                  <span className="chat-interview-avatar"><KuzanaMark /></span>
                  <div className="chat-interview-bubble chat-interview-typing">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              )}
            </div>

            {sending && waitingLong && (
              <p className="chat-interview-hint">Still thinking - taking longer than usual, hang tight...</p>
            )}

            {error && <p className="chat-interview-error">{error}</p>}

            <div className="chat-interview-composer field">
              <textarea
                ref={textareaRef}
                className="chat-interview-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your reply..."
                rows={1}
                disabled={sending}
                autoFocus
              />
              <button
                className={`chat-interview-send ${input.trim() && !sending ? 'ready' : ''}`}
                onClick={handleSend}
                disabled={!input.trim() || sending}
                aria-label="Send"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>

            {hasUserReply && (
              <div className="chat-interview-finish-row">
                {!readyToFinish && userTurnCount >= MAX_TURNS_BEFORE_NUDGE && (
                  <p className="chat-interview-hint" style={{ marginBottom: '0.5rem' }}>
                    We've covered a lot of ground - feel free to wrap up whenever works for you.
                  </p>
                )}
                <button onClick={handleFinish} className={effectiveReadyToFinish ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}>
                  {effectiveReadyToFinish ? "Finish interview →" : "Wrap up early"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
