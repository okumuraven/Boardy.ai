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

  // Personalized, second-person pitch ("you need X because...") - falls
  // back to the older shared third-person fields for matches created
  // before this existed, so nothing breaks for in-flight matches.
  const headline = match.my_pitch?.headline || match.ai_reasoning;
  const strengths = match.my_pitch?.strengths?.length ? match.my_pitch.strengths : match.ai_strengths;
  const gaps = match.my_pitch?.gaps?.length ? match.my_pitch.gaps : match.ai_gaps;

  useEffect(() => {
    if (!isWaiting) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${apiUrl}/api/matches/${match.match_id}/status?user_id=${profile.id}`);
        if (!res.ok) {
          // The match no longer exists (or errored) - back out to the
          // matches list rather than keep polling a dead match_id or
          // rendering a broken card off an error body.
          clearInterval(pollRef.current);
          onResolvedRef.current({ declined: true });
          return;
        }
        const data = await res.json();
        if (data.status === "unlocked") {
          clearInterval(pollRef.current);
          onResolvedRef.current({ unlocked: true, chatRoomId: data.chat_room_id, otherUserName: match.other_user?.name });
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

      if (data.status === "unlocked") {
        onResolvedRef.current({ unlocked: true, chatRoomId: data.chat_room_id });
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

  // Belt-and-suspenders: if `match` ever turns out not to be a real
  // match_detail payload (every field's fallback firing at once -
  // "Someone · unspecified role", "NaN% match" - was the visible symptom
  // of this), show a plain error instead of that broken render. The
  // actual root causes (stale error bodies, missing remount on match
  // switch) are fixed at the call sites; this keeps the component itself
  // safe regardless of what it's handed. Placed after every hook above
  // so this conditional return never changes the hook count between
  // renders.
  if (!match?.other_user || typeof match.ai_score !== "number") {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Couldn't load this match. Try selecting it again.</p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", overflowY: "auto", display: "flex", flexDirection: "column" }}>
      <div className="identity-badge">
        Signed in as <strong style={{ color: "var(--paper)" }}>{profile?.name || "you"}</strong>
      </div>

      <main
        className="centered-stage"
        style={{ animation: "fadeUpIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
      >
        <h1 className="ai-greeting" style={{ fontSize: "2.4rem", marginBottom: "0.25rem" }}>
          Match Found
        </h1>
        <p className="ai-subtext" style={{ marginBottom: "0.5rem" }}>
          {match.other_user?.name || "Someone"} · {match.other_user?.role || "unspecified role"}
        </p>
        <div className="match-score">
          {Math.round(match.ai_score)}% match
        </div>

        <div style={{ width: "100%", maxWidth: "640px", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="panel">
            <p className="panel-label">Why this match</p>
            <div style={{ color: "var(--paper)", fontSize: "0.95rem", lineHeight: "1.6" }}>
              {headline}
            </div>
          </div>

          {strengths?.length > 0 && (
            <div className="panel">
              <p className="panel-label">What this brings you</p>
              <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "var(--paper)", fontSize: "0.9rem", lineHeight: "1.7" }}>
                {strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {gaps?.length > 0 && (
            <div className="panel warn">
              <p className="panel-label warn">
                Worth knowing (the rest of the {100 - Math.round(match.ai_score)}%)
              </p>
              <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "var(--paper)", fontSize: "0.9rem", lineHeight: "1.7" }}>
                {gaps.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          )}

          {isWaiting ? (
            <div style={{ textAlign: "center", padding: "1rem", color: "var(--muted)" }}>
              <div className="spinner" style={{ width: "28px", height: "28px", margin: "0 auto 0.75rem" }}></div>
              You're in. Waiting for {match.other_user?.name || "them"} to respond.
            </div>
          ) : showDeclineForm ? (
            <div className="panel">
              <p className="panel-label">Why isn't this a fit?</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
                {DECLINE_REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setDeclineReason(r)}
                    disabled={busy}
                    className={`chip ${declineReason === r ? "selected" : ""}`}
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
                  background: "var(--ink)",
                  border: "1px solid var(--ink-line)",
                  borderRadius: "4px",
                  color: "var(--paper)",
                  padding: "0.75rem",
                  fontSize: "0.9rem",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
              {declineError && (
                <p style={{ color: "var(--warn)", fontSize: "0.85rem", margin: "0.5rem 0 0" }}>{declineError}</p>
              )}
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1rem" }}>
                <button
                  onClick={() => {
                    setShowDeclineForm(false);
                    setDeclineReason("");
                    setDeclineError("");
                  }}
                  disabled={busy}
                  className="btn-ghost"
                >
                  Back
                </button>
                <button onClick={submitDecline} disabled={busy} className="btn-primary">
                  {busy ? "Submitting..." : "Confirm Decline"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "0.5rem" }}>
              <button onClick={() => setShowDeclineForm(true)} disabled={busy} className="btn-ghost">
                Not Right Now
              </button>
              <button onClick={() => respond("accepted")} disabled={busy} className="btn-primary">
                I'm Interested
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
