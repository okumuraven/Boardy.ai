const initials = (name) =>
  (name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const timeLabel = (iso) => {
  if (!iso) return "";
  const date = new Date(iso);
  const isToday = date.toDateString() === new Date().toDateString();
  return isToday
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
};

// Every match reaching this list is either still awaiting mutual review
// or already unlocked - consent unlocks a match immediately now, no
// intermediate status in between (see MatchesView.jsx).
const previewFor = (match) => {
  if (match.status === "unlocked") return match.last_message?.body || "Say hello — you're connected.";
  return `${Math.round(match.ai_score)}% match — awaiting your review`;
};

const statusPillFor = (match) => (match.status === "pending_consent" ? "Pending consent" : null);

export default function MatchesList({ matches, loading, selectedId, onSelect, hideOnMobile }) {
  return (
    <div className={`matches-list ${hideOnMobile ? "hide-on-mobile-when-selected" : ""}`}>
      <header>
        <h2>Matches</h2>
        <span className="count">{matches.length} active</span>
      </header>

      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
          <div className="spinner" style={{ width: "22px", height: "22px", margin: "0 auto" }}></div>
        </div>
      ) : matches.length === 0 ? (
        <p style={{ padding: "0 1.1rem", color: "var(--muted)", fontSize: "0.85rem" }}>
          No matches yet — find one from Home.
        </p>
      ) : (
        matches.map((match) => {
          const pill = statusPillFor(match);
          return (
            <button
              key={match.match_id}
              className={`match-row ${selectedId === match.match_id ? "active" : ""}`}
              onClick={() => onSelect(match.match_id)}
            >
              <div className="match-avatar">
                {initials(match.other_user?.name)}
                {match.status === "unlocked" && <span className="status-dot"></span>}
              </div>
              <div className="match-body">
                <div className="match-top">
                  <span className="match-name">{match.other_user?.name || "Someone"}</span>
                  <span className="match-time">{timeLabel(match.last_message?.inserted_at || match.updated_at)}</span>
                </div>
                <div className="match-preview">{previewFor(match)}</div>
                {pill && <span className="match-status-pill">{pill}</span>}
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}
