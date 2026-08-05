import Avatar from "../../components/Avatar";

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
// intermediate status in between (see MatchesView.jsx). Within
// "pending_consent" there are three real states worth telling apart at a
// glance rather than one generic "Pending consent" pill for all of them:
// nobody's responded yet, I'm the one waiting, or they're the one
// waiting on me - that last one is the one worth surfacing clearly.
const previewFor = (match) => {
  if (match.status === "unlocked") return match.last_message?.body || "Say hello — you're connected.";
  if (match.other_response === "accepted" && match.my_response !== "accepted") return "They're interested — your move";
  if (match.my_response === "accepted") return "Waiting for their response";
  return `${Math.round(match.ai_score)}% match — awaiting your review`;
};

const statusPillFor = (match) => {
  if (match.status !== "pending_consent") return null;
  if (match.other_response === "accepted" && match.my_response !== "accepted") return "Interested in you";
  return "Pending consent";
};

const isHighlighted = (match) => match.status === "pending_consent" && match.other_response === "accepted" && match.my_response !== "accepted";

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
          const highlighted = isHighlighted(match);
          return (
            <button
              key={match.match_id}
              className={`match-row ${selectedId === match.match_id ? "active" : ""} ${highlighted ? "highlighted" : ""}`}
              onClick={() => onSelect(match.match_id)}
            >
              <Avatar
                avatarUrl={match.other_user?.avatar_url}
                name={match.other_user?.name}
                className="match-avatar"
              >
                {match.status === "unlocked" && <span className="status-dot"></span>}
              </Avatar>
              <div className="match-body">
                <div className="match-top">
                  <span className="match-name">{match.other_user?.name || "Someone"}</span>
                  <span className="match-time">{timeLabel(match.last_message?.inserted_at || match.updated_at)}</span>
                </div>
                <div className="match-preview">{previewFor(match)}</div>
                {pill && <span className={`match-status-pill ${highlighted ? "signal" : ""}`}>{pill}</span>}
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}
