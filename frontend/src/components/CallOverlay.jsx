import "./CallOverlay.css";
import Avatar from "./Avatar";

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

const STATUS_COPY = {
  calling: "Calling…",
  incoming: "Incoming call…",
  connecting: "Connecting…",
};

// A simple animated waveform standing in for "there's live audio here" -
// the one visual only a voice call actually has a right to. Bars are
// pure CSS, staggered so they never move in lockstep.
function Waveform() {
  return (
    <div className="call-waveform" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <span key={i} style={{ animationDelay: `${i * 0.09}s` }} />
      ))}
    </div>
  );
}

// Pure presentational piece of CallPanel.jsx - split out to stay under
// the 250-line file cap. No state of its own, just renders whichever
// call state CallPanel hands it.
export default function CallOverlay({
  status,
  incomingFrom,
  partnerName,
  partnerAvatarUrl,
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
  // The brand ring keeps turning while something is unresolved (ringing
  // out, being rung, or negotiating media) and settles once a call
  // actually connects - a resolved moment doesn't need to keep moving.
  const isPending = status === "calling" || status === "incoming" || status === "connecting";

  return (
    <div className="call-overlay">
      <div className="call-overlay-glow"></div>
      <div className="call-overlay-card">
        <div className={`call-ring-frame ${isPending ? "spinning" : ""} ${status === "incoming" ? "ringing" : ""}`}>
          <div className="call-ring-frame-inner">
            <Avatar avatarUrl={partnerAvatarUrl} name={displayName} className="call-overlay-avatar" />
          </div>
        </div>

        <p className="call-overlay-name">{displayName}</p>

        {status === "in_call" ? (
          <div className="call-overlay-live-row">
            <Waveform />
            <span className="call-overlay-timer">{formatElapsed(elapsed)}</span>
          </div>
        ) : status === "error" ? (
          <p className="call-overlay-error">{callError}</p>
        ) : (
          <span className="call-overlay-status-pill">{STATUS_COPY[status]}</span>
        )}

        <div className="call-overlay-actions">
          {status === "calling" && (
            <button onClick={onCancel} className="call-overlay-btn call-overlay-btn-end" aria-label="Cancel call">
              <PhoneOffIcon />
            </button>
          )}

          {status === "incoming" && (
            <>
              <button onClick={onDecline} className="call-overlay-btn call-overlay-btn-end" aria-label="Decline call">
                <PhoneOffIcon />
              </button>
              <button onClick={onAccept} className="call-overlay-btn call-overlay-btn-accept" aria-label="Accept call">
                <PhoneIcon />
              </button>
            </>
          )}

          {status === "connecting" && (
            <button onClick={onEnd} className="call-overlay-btn call-overlay-btn-end" aria-label="Cancel">
              <PhoneOffIcon />
            </button>
          )}

          {status === "in_call" && (
            <>
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
            </>
          )}

          {status === "error" && (
            <button onClick={onDismissError} className="btn-ghost call-overlay-close">Close</button>
          )}
        </div>
      </div>
    </div>
  );
}
