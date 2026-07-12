import { useState, useEffect, useRef } from "react";

// Shows the transparent AI breakdown for a candidate match - score,
// reasoning, what lines up, and what doesn't - and lets each person
// independently accept or decline before anything is unlocked.
const DECLINE_REASONS = [
  "Different stage or focus area",
  "Skillset doesn't line up",
  "Not the right time",
];

export default function MatchReview({ profile, initialMatch, onResolved }) {
  const [match, setMatch] = useState(initialMatch);
  const [busy, setBusy] = useState(false);
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declineError, setDeclineError] = useState("");
  const pollRef = useRef(null);
  const onResolvedRef = useRef(onResolved);
  onResolvedRef.current = onResolved;

  const apiUrl = import.meta.env.VITE_API_URL;
  const isWaiting = match.my_response === "accepted" && match.other_response !== "accepted";

  useEffect(() => {
    if (!isWaiting) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${apiUrl}/api/matches/${match.match_id}/status?user_id=${profile.id}`);
        const data = await res.json();
        if (data.status === "unlocked") {
          clearInterval(pollRef.current);
          onResolvedRef.current({ unlocked: true, chatRoomId: data.chat_room_id });
        } else if (data.status === "declined") {
          clearInterval(pollRef.current);
          onResolvedRef.current({ declined: true });
        }
      } catch (err) {
        console.error("MatchReview poll failed:", err);
      }
    }, 8000);

    return () => clearInterval(pollRef.current);
  }, [isWaiting, match.match_id, apiUrl, profile.id]);

  const respond = async (response, reason) => {
    setBusy(true);
    try {
      const res = await fetch(`${apiUrl}/api/matches/${match.match_id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: profile.id, response, reason }),
      });
      const data = await res.json();

      if (data.status === "awaiting_stake") {
        onResolvedRef.current({ awaitingStake: true });
      } else if (data.status === "declined") {
        onResolvedRef.current({ declined: true });
      } else if (data.status === "waiting_on_other") {
        setMatch((m) => ({ ...m, my_response: "accepted" }));
      } else if (response === "declined") {
        setDeclineError(data.error || "Something went wrong recording your response.");
      } else {
        alert(data.error || "Something went wrong recording your response.");
      }
    } catch (err) {
      console.error("MatchReview respond failed:", err);
      if (response === "declined") {
        setDeclineError("Couldn't reach the server. Please try again.");
      } else {
        alert("Couldn't reach the server. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  const submitDecline = () => {
    if (!declineReason.trim()) {
      setDeclineError("Please pick or write a brief reason.");
      return;
    }
    setDeclineError("");
    respond("declined", declineReason.trim());
  };

  const cardStyle = {
    background: "rgba(0,0,0,0.4)",
    border: "1px solid rgba(0, 240, 255, 0.2)",
    borderRadius: "24px",
    padding: "1.5rem",
    textAlign: "left",
  };
  const labelStyle = {
    color: "var(--primary)",
    fontSize: "0.8rem",
    fontWeight: 600,
    textTransform: "uppercase",
    marginBottom: "0.75rem",
    letterSpacing: "0.05em",
  };

  return (
    <div style={{ width: "100%", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>

      <main
        className="onboarding-container"
        style={{ justifyContent: "center", animation: "fadeUpIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
      >
        <h1 className="ai-greeting" style={{ fontSize: "2.4rem", marginBottom: "0.25rem" }}>
          Match Found
        </h1>
        <p className="ai-subtext" style={{ marginBottom: "0.5rem" }}>
          {match.other_user?.name || "Someone"} · {match.other_user?.role || "unspecified role"}
        </p>
        <div
          className="gradient-text"
          style={{ fontSize: "2.5rem", fontWeight: 700, marginBottom: "1.5rem" }}
        >
          {Math.round(match.ai_score)}% match
        </div>

        <div style={{ width: "100%", maxWidth: "640px", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={cardStyle}>
            <p style={labelStyle}>Why this match</p>
            <div style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.95rem", lineHeight: "1.6" }}>
              {match.ai_reasoning}
            </div>
          </div>

          {match.ai_strengths?.length > 0 && (
            <div style={cardStyle}>
              <p style={labelStyle}>What lines up</p>
              <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "rgba(255,255,255,0.85)", fontSize: "0.9rem", lineHeight: "1.7" }}>
                {match.ai_strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {match.ai_gaps?.length > 0 && (
            <div style={{ ...cardStyle, borderColor: "rgba(255, 190, 80, 0.25)" }}>
              <p style={{ ...labelStyle, color: "#ffbe50" }}>
                Worth knowing (the rest of the {100 - Math.round(match.ai_score)}%)
              </p>
              <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "rgba(255,255,255,0.85)", fontSize: "0.9rem", lineHeight: "1.7" }}>
                {match.ai_gaps.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          )}

          {isWaiting ? (
            <div style={{ textAlign: "center", padding: "1rem", color: "var(--text-muted)" }}>
              <div
                className="spinner"
                style={{
                  width: "28px",
                  height: "28px",
                  margin: "0 auto 0.75rem",
                  border: "3px solid rgba(255,255,255,0.1)",
                  borderTopColor: "var(--primary)",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              ></div>
              You're in. Waiting for {match.other_user?.name || "them"} to respond.
            </div>
          ) : showDeclineForm ? (
            <div style={cardStyle}>
              <p style={labelStyle}>Why isn't this a fit?</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
                {DECLINE_REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setDeclineReason(r)}
                    disabled={busy}
                    style={{
                      background: declineReason === r ? "rgba(0, 240, 255, 0.15)" : "transparent",
                      border:
                        declineReason === r ? "1px solid var(--primary)" : "1px solid rgba(255,255,255,0.15)",
                      borderRadius: "100px",
                      color: "rgba(255,255,255,0.85)",
                      padding: "0.5rem 1rem",
                      fontSize: "0.85rem",
                      cursor: busy ? "default" : "pointer",
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Or write your own reason..."
                disabled={busy}
                rows={2}
                style={{
                  width: "100%",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "12px",
                  color: "rgba(255,255,255,0.9)",
                  padding: "0.75rem",
                  fontSize: "0.9rem",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
              {declineError && (
                <p style={{ color: "#ffbe50", fontSize: "0.85rem", margin: "0.5rem 0 0" }}>{declineError}</p>
              )}
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1rem" }}>
                <button
                  onClick={() => {
                    setShowDeclineForm(false);
                    setDeclineReason("");
                    setDeclineError("");
                  }}
                  disabled={busy}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "100px",
                    color: "var(--text-muted)",
                    padding: "0.7rem 1.25rem",
                    fontSize: "0.9rem",
                    cursor: busy ? "default" : "pointer",
                  }}
                >
                  Back
                </button>
                <button
                  onClick={submitDecline}
                  disabled={busy}
                  className="action-btn ready"
                  style={{ padding: "0.7rem 1.5rem", borderRadius: "100px" }}
                >
                  {busy ? "Submitting..." : "Confirm Decline"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "0.5rem" }}>
              <button
                onClick={() => setShowDeclineForm(true)}
                disabled={busy}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "100px",
                  color: "var(--text-muted)",
                  padding: "0.9rem 1.5rem",
                  fontSize: "0.95rem",
                  cursor: busy ? "default" : "pointer",
                }}
              >
                Not Right Now
              </button>
              <button
                onClick={() => respond("accepted")}
                disabled={busy}
                className="action-btn ready"
                style={{ padding: "0.9rem 1.75rem", borderRadius: "100px" }}
              >
                I'm Interested
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
