import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";
import { rolePlural } from "../../constants/roles";

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
          <span className="stats-card-icon">🔓</span>
          <p className="stats-card-value">{data.stats.matches_unlocked}</p>
          <p className="stats-card-label">Matches unlocked</p>
        </div>
        <div className="stats-card-divider" />
        <div>
          <span className="stats-card-icon">📞</span>
          <p className="stats-card-value">{data.stats.calls_completed}</p>
          <p className="stats-card-label">Calls completed</p>
        </div>
      </div>
      <div className="stats-card-rank">🏅 {rankLabel(data.rank, profile?.role)}</div>
    </div>
  );
}
