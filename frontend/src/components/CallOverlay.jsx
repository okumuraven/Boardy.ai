import "./CallOverlay.css";

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
  return (
    <div className="call-overlay">
      <div className="call-overlay-card">
        <div className="match-avatar call-overlay-avatar">
          {(status === "incoming" ? incomingFrom?.name : partnerName || "Someone")?.[0] || "?"}
        </div>

        {status === "calling" && (
          <>
            <p className="call-overlay-name">{partnerName || "Someone"}</p>
            <p className="call-overlay-status">Calling...</p>
            <button onClick={onCancel} className="btn-ghost call-overlay-end">Cancel</button>
          </>
        )}

        {status === "incoming" && (
          <>
            <p className="call-overlay-name">{incomingFrom?.name || "Someone"}</p>
            <p className="call-overlay-status">Incoming call...</p>
            <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
              <button onClick={onDecline} className="btn-ghost call-overlay-end">Decline</button>
              <button onClick={onAccept} className="btn-primary">Accept</button>
            </div>
          </>
        )}

        {status === "connecting" && (
          <>
            <p className="call-overlay-name">{partnerName || "Someone"}</p>
            <p className="call-overlay-status">Connecting audio...</p>
            <button onClick={onEnd} className="btn-ghost call-overlay-end">Cancel</button>
          </>
        )}

        {status === "in_call" && (
          <>
            <p className="call-overlay-name">{partnerName || "Someone"}</p>
            <p className="call-overlay-status">{formatElapsed(elapsed)}</p>
            <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
              <button onClick={onToggleMute} className={`btn-ghost ${muted ? "call-overlay-muted" : ""}`}>
                {muted ? "Unmute" : "Mute"}
              </button>
              <button onClick={onEnd} className="btn-ghost call-overlay-end">End Call</button>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <p className="call-overlay-name">{partnerName || "Someone"}</p>
            <p className="call-overlay-error">{callError}</p>
            <button onClick={onDismissError} className="btn-ghost call-overlay-end">Close</button>
          </>
        )}
      </div>
    </div>
  );
}
