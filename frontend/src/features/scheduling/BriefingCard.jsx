const MODES = ["call", "video", "chat"];
const MODE_TEXT = { call: "Call", video: "Video", chat: "Chat first" };

function CallIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: "13px", height: "13px", marginRight: "0.35rem", verticalAlign: "-2px" }}>
      <path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L14 13l5 2v3a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: "13px", height: "13px", marginRight: "0.35rem", verticalAlign: "-2px" }}>
      <path d="M15 10.5V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3.5l5 3.5v-11l-5 3.5Z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: "13px", height: "13px", marginRight: "0.35rem", verticalAlign: "-2px" }}>
      <path d="M4 5h16v11H9l-4 4v-4H4z" />
    </svg>
  );
}

const MODE_ICON = { call: CallIcon, video: VideoIcon, chat: ChatIcon };

function ModeLabel({ mode }) {
  const Icon = MODE_ICON[mode] || CallIcon;
  return <><Icon />{MODE_TEXT[mode] || MODE_TEXT.call}</>;
}

// Private per-user pre-call briefing - never shown to the other side of
// the match. `myPreference` is editable here (tapping cycles the mode)
// but that edit is scoped to this one intro; it never touches the
// stored profile default.
export default function BriefingCard({ briefing, myPreference, otherPreference, partnerName, onChangePreference }) {
  const cycleMode = () => {
    const next = MODES[(MODES.indexOf(myPreference) + 1) % MODES.length];
    onChangePreference(next);
  };

  return (
    <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <p className="panel-label">Before you talk to {partnerName || "them"}</p>

      {briefing?.summary && <p style={{ margin: 0, color: "var(--paper)", fontSize: "0.95rem" }}>{briefing.summary}</p>}

      {briefing?.talking_points?.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "var(--text-muted)", fontSize: "0.88rem", lineHeight: 1.6 }}>
          {briefing.talking_points.map((point, idx) => (
            <li key={idx}>{point}</li>
          ))}
        </ul>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.25rem" }}>
        <button onClick={cycleMode} className="btn-ghost" style={{ padding: "0.4rem 0.9rem", fontSize: "0.85rem" }}>
          You prefer: <ModeLabel mode={myPreference} /> - tap to change
        </button>
        <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
          They prefer: <ModeLabel mode={otherPreference} />
        </span>
      </div>
    </div>
  );
}
