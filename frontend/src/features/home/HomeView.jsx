import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";
import Dashboard from "../../components/Dashboard";

const TYPE_GLYPH = {
  chat_message: { icon: "💬", bg: "var(--ink-line)", color: "var(--muted)" },
  calendar_reminder: { icon: "🔔", bg: "var(--warn-wash)", color: "var(--warn)" },
  new_match: { icon: "✨", bg: "var(--signal-wash)", color: "var(--signal)" },
  incoming_call: { icon: "📞", bg: "var(--brass-wash)", color: "var(--brass)" },
};

const timeAgo = (iso) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

// Real stats (no invented numbers) plus the existing voice-interview /
// profile-summary management panel underneath, now living inside the
// shell's content area instead of being the entire screen.
export default function HomeView({ profile, onInterviewComplete, onFindMatch, onOpenProfile }) {
  const [matches, setMatches] = useState([]);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    if (!profile?.id) return;

    apiFetch(`/api/matches`)
      .then((res) => res.json())
      .then((data) => setMatches(data.matches || []))
      .catch(() => {});

    apiFetch(`/api/notifications`)
      .then((res) => res.json())
      .then((data) => setActivity((data.notifications || []).slice(0, 5)))
      .catch(() => {});
  }, [profile?.id]);

  const awaitingResponse = matches.filter((m) => m.status === "pending_consent" && m.my_response !== "accepted").length;
  const showInvestmentPrompt = profile?.role === "investor" || profile?.looking_for_tags?.includes("funding");

  return (
    <div className="home-view">
      <div className="home-view-content">
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "1.6rem", margin: "0 0 0.25rem" }}>
          Welcome back, {profile?.name?.split(" ")[0] || "there"}.
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: "0 0 1.75rem" }}>
          Here's what's moving across your introductions.
        </p>

        {showInvestmentPrompt && (
          <div className="home-investment-prompt">
            <p>
              {profile?.role === "investor"
                ? "Add your investment criteria so founders know what you're looking for."
                : "Add your funding details so investors can find you in the Directory."}
            </p>
            <button className="btn-ghost btn-sm" onClick={onOpenProfile}>Go to Profile</button>
          </div>
        )}

        <div className="home-stats-row">
          <div className="home-stat-tile">
            <div className="home-stat-icon">🤝</div>
            <div className="num">{matches.length}</div>
            <div className="lbl">Active introductions</div>
          </div>
          <div className="home-stat-tile">
            <div className="home-stat-icon">⏳</div>
            <div className="num">{awaitingResponse}</div>
            <div className="lbl">Awaiting your response</div>
          </div>
        </div>

        {activity.length > 0 && (
          <>
            <p className="panel-label" style={{ marginBottom: "0.5rem" }}>Recent activity</p>
            <div style={{ marginBottom: "2rem" }}>
              {activity.map((n) => {
                const glyph = TYPE_GLYPH[n.type] || TYPE_GLYPH.chat_message;
                return (
                  <div className="home-activity-row" key={n.id}>
                    <div className="home-activity-glyph" style={{ background: glyph.bg, color: glyph.color }}>
                      {glyph.icon}
                    </div>
                    <div>
                      <div className="home-activity-text">{n.body}</div>
                      <div className="home-activity-time">{timeAgo(n.inserted_at)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <p className="panel-label" style={{ marginBottom: "1rem", paddingTop: "0.5rem", borderTop: "1px solid var(--ink-line)" }}>
          Your voice interview
        </p>
        <Dashboard profile={profile} onInterviewComplete={onInterviewComplete} onFindMatch={onFindMatch} />
      </div>
    </div>
  );
}
