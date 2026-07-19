const MODES = ["call", "video", "chat"];
const MODE_LABEL = { call: "📞 Call", video: "🎥 Video", chat: "💬 Chat first" };

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
          You prefer: {MODE_LABEL[myPreference] || MODE_LABEL.call} - tap to change
        </button>
        <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
          They prefer: {MODE_LABEL[otherPreference] || MODE_LABEL.call}
        </span>
      </div>
    </div>
  );
}
