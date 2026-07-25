import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";
import { rolePlural, roleTitle } from "../../constants/roles";

const rankLabel = (rank, role) => {
  if (!rank) return null;
  return `Ranked #${rank.rank} of ${rank.total_in_category} ${rolePlural(role)}`;
};

// The redacted view of a matched counterpart - Vokazi.Reputation.CounterpartProfile.
// Shows the AI-vetted pitch, summarized GitHub facts, and verified/added
// badges for LinkedIn/X/portfolio - never a raw clickable link. This is
// only ever reachable once the match is unlocked (server re-checks this
// regardless of what this panel shows).
export default function MatchProfilePanel({ matchId, profile, partnerName, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch(`/api/matches/${matchId}/counterpart_profile`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else setData(json);
      })
      .catch(() => setError("Couldn't load this profile."))
      .finally(() => setLoading(false));
  }, [matchId, profile.id]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <div className="spinner" style={{ width: "28px", height: "28px", margin: "0 auto" }}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "1.25rem" }}>
        <p style={{ color: "var(--warn)", fontSize: "0.9rem" }}>{error}</p>
        <button onClick={onClose} className="btn-ghost" style={{ marginTop: "0.75rem" }}>← Back to chat</button>
      </div>
    );
  }

  const rank = rankLabel(data.rank, data.role);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1.25rem", overflowY: "auto" }}>
      <div>
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "1.3rem", margin: 0, color: "var(--paper)" }}>
          {data.name || partnerName}
        </h3>
        {data.role && <span className="social-chip" style={{ marginTop: "0.4rem", display: "inline-block" }}>{roleTitle(data.role)}</span>}
        {(data.company || data.location) && (
          <p style={{ fontSize: "0.82rem", color: "var(--muted)", margin: "0.4rem 0 0" }}>
            {[data.company, data.location].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      <div className="panel" style={{ display: "flex", gap: "1.25rem" }}>
        <div>
          <p className="panel-label" style={{ marginBottom: "0.2rem" }}>Matches unlocked</p>
          <p style={{ fontSize: "1.3rem", color: "var(--paper)", fontFamily: "var(--font-mono)" }}>{data.stats.matches_unlocked}</p>
        </div>
        <div>
          <p className="panel-label" style={{ marginBottom: "0.2rem" }}>Calls completed</p>
          <p style={{ fontSize: "1.3rem", color: "var(--paper)", fontFamily: "var(--font-mono)" }}>{data.stats.calls_completed}</p>
        </div>
      </div>

      {rank && (
        <div className="panel" style={{ textAlign: "center", padding: "0.9rem" }}>
          <span style={{ color: "var(--brass)", fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>🏅 {rank}</span>
        </div>
      )}

      {data.bio && (
        <div>
          <p className="panel-label">About</p>
          <div className="profile-view-copy">{data.bio}</div>
        </div>
      )}

      {data.offer_text && (
        <div>
          <p className="panel-label">Offers</p>
          <div className="profile-view-copy">{data.offer_text}</div>
        </div>
      )}

      {data.need_text && (
        <div>
          <p className="panel-label">Looking for</p>
          <div className="profile-view-copy">{data.need_text}</div>
        </div>
      )}

      <div>
        <p className="panel-label">Verification</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {data.github && (
            <span className="social-chip">
              GitHub · {data.github.account_age_years}+ yrs · {data.github.public_repos} repos
              {data.github.top_languages?.length > 0 && ` · ${data.github.top_languages.join(", ")}`}
            </span>
          )}
          <span className="social-chip" style={data.linkedin_verified ? { color: "var(--signal)" } : undefined}>
            {data.linkedin_verified ? "✓ LinkedIn verified" : "LinkedIn not added"}
          </span>
          <span className="social-chip" style={data.x_verified ? { color: "var(--signal)" } : undefined}>
            {data.x_verified ? "✓ X / Twitter verified" : "X / Twitter not added"}
          </span>
          <span className="social-chip" style={data.portfolio_added ? { color: "var(--signal)" } : undefined}>
            {data.portfolio_added ? "✓ Portfolio added" : "Portfolio not added"}
          </span>
        </div>
      </div>

      <button onClick={onClose} className="btn-ghost" style={{ alignSelf: "center", padding: "0.5rem 1.2rem", fontSize: "0.85rem" }}>
        ← Back to chat
      </button>
    </div>
  );
}
