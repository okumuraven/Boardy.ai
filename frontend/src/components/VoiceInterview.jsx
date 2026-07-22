// The mic-button voice interview: idle / connecting / active states,
// pulsing rings while recording, and a live transcript preview. Lives
// inside HomeView's dashboard now, not as its own full-viewport hero -
// kept visually prominent (this is a focused activity) but contained.
export default function VoiceInterview({ profile, callStatus, transcript, onCallClick, onBackToProfile }) {
  return (
    <div style={{ textAlign: 'center', animation: 'fadeUpIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
      {profile?.offer_text && (
        <div style={{ textAlign: 'right', marginBottom: '0.5rem' }}>
          <button onClick={onBackToProfile} className="btn-ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            ← Back to profile
          </button>
        </div>
      )}

      <div style={{ position: 'relative', width: '160px', height: '160px', margin: '1rem auto 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

        {/* Pulsing Rings when Active */}
        {callStatus === "active" && (
          <>
            <div style={{ position: 'absolute', inset: -16, border: '2px solid var(--warn)', borderRadius: '50%', opacity: 0.5, animation: 'pulse 1.5s infinite' }}></div>
            <div style={{ position: 'absolute', inset: -32, border: '1px solid var(--warn)', borderRadius: '50%', opacity: 0.3, animation: 'pulse 1.5s infinite 0.3s' }}></div>
            <div style={{ position: 'absolute', inset: -48, border: '1px solid var(--warn)', borderRadius: '50%', opacity: 0.1, animation: 'pulse 1.5s infinite 0.6s' }}></div>
          </>
        )}

        {/* Main Button */}
        <button
          onClick={onCallClick}
          className={`action-btn ${callStatus === "inactive" ? 'ready' : ''}`}
          style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            position: 'relative',
            zIndex: 10,
            background: callStatus === "active" ? 'var(--warn-wash)' : undefined,
            border: callStatus === "active" ? '2px solid var(--warn)' : 'none'
          }}
        >
          {callStatus === "inactive" && (
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="22"></line>
            </svg>
          )}
          {callStatus === "connecting" && <div className="spinner" style={{ width: '28px', height: '28px' }}></div>}
          {callStatus === "active" && (
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect>
            </svg>
          )}
        </button>
      </div>

      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.6rem', margin: '0 0 0.75rem', color: 'var(--paper)' }}>
        {callStatus === "inactive" ? "Ready when you are." : ""}
        {callStatus === "connecting" ? "Establishing connection..." : ""}
        {callStatus === "active" ? <span className="accent-text">Listening...</span> : ""}
      </h2>

      <p style={{ color: 'var(--muted)', fontSize: '0.92rem', maxWidth: '520px', margin: '0 auto 1.5rem' }}>
        {callStatus === "inactive"
          ? "Tap the microphone. Tell us exactly what your company is building, what's bottlenecking you, and what you can offer someone else."
          : callStatus === "active"
            ? "Speak naturally. When you're done, tap the button again to end the call - we'll process your profile automatically."
            : "Speak naturally. Our AI is extracting your needs and offers to find your best match."}
      </p>

      {/* Live Transcript Box */}
      {callStatus === "active" && transcript && (
        <div className="panel animate-in" style={{ width: '100%', maxWidth: '600px', margin: '0 auto', maxHeight: '200px', overflowY: 'auto', textAlign: 'left' }}>
          <p className="panel-label">Live Transcript</p>
          <div style={{ color: 'var(--paper)', fontSize: '0.95rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
            {transcript}
          </div>
        </div>
      )}
    </div>
  );
}
