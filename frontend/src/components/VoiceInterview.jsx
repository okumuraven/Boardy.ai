// The mic-button voice interview screen: idle / connecting / active
// states, pulsing rings while recording, and a live transcript preview.
export default function VoiceInterview({ profile, callStatus, transcript, onCallClick, onBackToProfile }) {
  return (
    <main className="onboarding-container" style={{ justifyContent: 'center', animation: 'fadeUpIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
      {profile?.offer_text && (
        <button
          onClick={onBackToProfile}
          className="btn-ghost back-to-profile"
          style={{ position: 'absolute', top: '6rem', right: '3rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
        >
          ← Back to profile
        </button>
      )}
      <div style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto 3rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

        {/* Pulsing Rings when Active */}
        {callStatus === "active" && (
          <>
            <div style={{ position: 'absolute', inset: -20, border: '2px solid #e84142', borderRadius: '50%', opacity: 0.5, animation: 'pulse 1.5s infinite' }}></div>
            <div style={{ position: 'absolute', inset: -40, border: '1px solid #e84142', borderRadius: '50%', opacity: 0.3, animation: 'pulse 1.5s infinite 0.3s' }}></div>
            <div style={{ position: 'absolute', inset: -60, border: '1px solid #e84142', borderRadius: '50%', opacity: 0.1, animation: 'pulse 1.5s infinite 0.6s' }}></div>
          </>
        )}

        {/* Main Button */}
        <button
          onClick={onCallClick}
          className={`action-btn ${callStatus === "inactive" ? 'ready' : ''}`}
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            position: 'relative',
            zIndex: 10,
            background: callStatus === "active" ? 'rgba(232, 65, 66, 0.1)' : undefined,
            border: callStatus === "active" ? '2px solid #e84142' : 'none'
          }}
        >
          {callStatus === "inactive" && (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="22"></line>
            </svg>
          )}
          {callStatus === "connecting" && <div className="spinner" style={{ width: '30px', height: '30px' }}></div>}
          {callStatus === "active" && (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e84142" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect>
            </svg>
          )}
        </button>
      </div>

      <h1 className="ai-greeting" style={{ fontSize: '2.8rem', marginBottom: '1rem', animationDelay: '0.1s' }}>
        {callStatus === "inactive" ? "Vokazi is ready to listen." : ""}
        {callStatus === "connecting" ? "Establishing connection..." : ""}
        {callStatus === "active" ? <span className="accent-text">Listening...</span> : ""}
      </h1>

      <p className="ai-subtext" style={{ maxWidth: '600px', animationDelay: '0.2s', marginBottom: '2rem' }}>
        {callStatus === "inactive"
          ? "Tap the microphone. Explain exactly what your startup is building, what technical challenges you face, and what resources you are offering to the ecosystem."
          : callStatus === "active"
            ? "Speak naturally. When you're done, tap the button again to end the call - we'll process your profile automatically."
            : "Speak naturally. Our AI is extracting your technical requirements and preparing them for vectorization."}
      </p>

      {/* Live Transcript Box */}
      {callStatus === "active" && transcript && (
        <div className="panel animate-in" style={{ width: '100%', maxWidth: '600px', maxHeight: '200px', overflowY: 'auto' }}>
          <p className="panel-label">Live Transcript</p>
          <div style={{ color: 'rgba(237,232,221,0.8)', fontSize: '0.95rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
            {transcript}
          </div>
        </div>
      )}
    </main>
  );
}
