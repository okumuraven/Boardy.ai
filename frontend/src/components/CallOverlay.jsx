import "./CallOverlay.css";

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L14 13l5 2v3a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z" />
    </svg>
  );
}

function PhoneOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L14 13l5 2v3a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5a3 3 0 0 1 6 0v6c0 .4-.06.79-.17 1.15" />
      <path d="M12 15a3 3 0 0 1-3-3v-1" />
      <path d="M19 10v2a7 7 0 0 1-9.8 6.4" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

const formatElapsed = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

// Pure presentational piece of CallPanel.jsx - split out to stay under
// the 250-line file cap. No state of its own, just renders whichever
// call state CallPanel hands it.
export default function CallOverlay({
  status,
  incomingFrom,
  partnerName,
  elapsed,
  muted,
  callError,
  onCancel,
  onAccept,
  onDecline,
  onEnd,
  onToggleMute,
  onDismissError,
}) {
  const displayName = (status === "incoming" ? incomingFrom?.name : partnerName) || "Someone";
  // Idle-pulse rings only make sense while something is actually in
  // flight (ringing out, being rung, or negotiating media) - a
  // connected call or an error state is a resolved moment, not a
  // "waiting" one.
  const isPulsing = status === "calling" || status === "incoming" || status === "connecting";

  return (
    <div className="call-overlay">
      <div className="call-overlay-card">
        <div className={`call-overlay-avatar-wrap ${status === "incoming" ? "ringing" : ""}`}>
          {isPulsing && (
            <>
              <div className="call-orb-ring"></div>
              <div className="call-orb-ring"></div>
            </>
          )}
          <div className="match-avatar call-overlay-avatar">{displayName[0] || "?"}</div>
        </div>

        {status === "calling" && (
          <>
            <p className="call-overlay-name">{displayName}</p>
            <p className="call-overlay-status">Calling…</p>
            <button onClick={onCancel} className="call-overlay-btn call-overlay-btn-end" aria-label="Cancel call">
              <PhoneOffIcon />
            </button>
          </>
        )}

        {status === "incoming" && (
          <>
            <p className="call-overlay-name">{displayName}</p>
            <p className="call-overlay-status">Incoming call…</p>
            <div className="call-overlay-actions">
              <button onClick={onDecline} className="call-overlay-btn call-overlay-btn-end" aria-label="Decline call">
                <PhoneOffIcon />
              </button>
              <button onClick={onAccept} className="call-overlay-btn call-overlay-btn-accept" aria-label="Accept call">
                <PhoneIcon />
              </button>
            </div>
          </>
        )}

        {status === "connecting" && (
          <>
            <p className="call-overlay-name">{displayName}</p>
            <p className="call-overlay-status">Connecting…</p>
            <button onClick={onEnd} className="call-overlay-btn call-overlay-btn-end" aria-label="Cancel">
              <PhoneOffIcon />
            </button>
          </>
        )}

        {status === "in_call" && (
          <>
            <p className="call-overlay-name">{displayName}</p>
            <p className="call-overlay-status call-overlay-timer">{formatElapsed(elapsed)}</p>
            <div className="call-overlay-actions">
              <button
                onClick={onToggleMute}
                className={`call-overlay-btn call-overlay-btn-secondary ${muted ? "active" : ""}`}
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted ? <MicOffIcon /> : <MicIcon />}
              </button>
              <button onClick={onEnd} className="call-overlay-btn call-overlay-btn-end" aria-label="End call">
                <PhoneOffIcon />
              </button>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <p className="call-overlay-name">{displayName}</p>
            <p className="call-overlay-error">{callError}</p>
            <button onClick={onDismissError} className="btn-ghost call-overlay-close">Close</button>
          </>
        )}
      </div>
    </div>
  );
}
