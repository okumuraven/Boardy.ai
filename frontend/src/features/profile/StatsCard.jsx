import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";
import { rolePlural } from "../../constants/roles";

// Real SVG, not emoji - matches the anti-emoji-icon convention used
// across the rest of the app. .stats-card-icon (Profile.css) sizes via
// font-size for a text/emoji glyph, so these are sized inline instead.
// Local copies rather than shell/icons.jsx's CallHistoryIcon - that one
// takes no props/sizing, so it can't be resized to fit here.
const ICON_STYLE = { width: "16px", height: "16px", color: "var(--muted)" };

function UnlockIcon() {
  return (
    <svg style={ICON_STYLE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 9.5-2.2" />
    </svg>
  );
}

function CallIcon() {
  return (
    <svg style={ICON_STYLE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L14 13l5 2v3a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z" />
    </svg>
  );
}

function MedalIcon() {
  return (
    <svg style={{ width: "14px", height: "14px", flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="15" r="5" />
      <path d="M9 11 7 3M15 11l2-8M9 3h6" />
    </svg>
  );
}

const rankLabel = (rank, role) => {
  if (!rank) return "Not yet ranked - complete your first intro call";
  return `Ranked #${rank.rank} of ${rank.total_in_category} ${rolePlural(role)}`;
};

// Kuzana Connect's own version of a "connections" count - two honest, separately
// shown numbers (matches unlocked, calls actually completed) plus a
// role-scoped rank built from real data, not self-reported. Front and
// center on your own profile as the motivating hook; a redacted version
// of this same data is what a matched counterpart sees (MatchProfilePanel).
export default function StatsCard({ profile }) {
  const [data, setData] = useState(null);
  const userId = profile?.id;

  useEffect(() => {
    if (!userId) return;
    apiFetch(`/api/profiles/stats`)
      .then((res) => res.json())
      .then(setData)
      .catch(() => {});
  }, [userId]);

  if (!data) return null;

  return (
    <div className="panel stats-card">
      <div className="stats-card-numbers">
        <div>
          <span className="stats-card-icon"><UnlockIcon /></span>
          <p className="stats-card-value">{data.stats.matches_unlocked}</p>
          <p className="stats-card-label">Matches unlocked</p>
        </div>
        <div className="stats-card-divider" />
        <div>
          <span className="stats-card-icon"><CallIcon /></span>
          <p className="stats-card-value">{data.stats.calls_completed}</p>
          <p className="stats-card-label">Calls completed</p>
        </div>
      </div>
      <div className="stats-card-rank" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <MedalIcon />
        {rankLabel(data.rank, profile?.role)}
      </div>
    </div>
  );
}
