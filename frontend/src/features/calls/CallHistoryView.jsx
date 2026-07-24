import { useState, useEffect } from "react";

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

const formatDuration = (seconds) => {
  const total = seconds || 0;
  return `${Math.floor(total / 60)}m ${total % 60}s`;
};

// "Missed call" vs. "No answer" mirrors how a real phone distinguishes
// the two sides of an unanswered call - someone missing you reads
// differently from them just never picking up.
const summaryFor = (call) => {
  if (call.status === "completed") return formatDuration(call.duration_seconds);
  if (call.status === "declined") return "Declined";
  if (call.status === "missed") return call.direction === "incoming" ? "Missed call" : "No answer";
  if (call.status === "cancelled") return call.direction === "outgoing" ? "Cancelled" : "Missed call";
  return call.status;
};

const isMissedForMe = (call) =>
  call.status === "declined" ||
  (call.direction === "incoming" && (call.status === "missed" || call.status === "cancelled"));

export default function CallHistoryView({ profile, onOpenMatch }) {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (!profile?.id) return;
    setLoading(true);
    fetch(`${apiUrl}/api/calls/history?user_id=${profile.id}`)
      .then((res) => res.json())
      .then((data) => setCalls(data.calls || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profile?.id, apiUrl]);

  return (
    <div className="call-history-view">
      <header className="call-history-header">
        <h2>Call History</h2>
        <span className="count">{calls.length} calls</span>
      </header>

      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
          <div className="spinner" style={{ width: "22px", height: "22px", margin: "0 auto" }}></div>
        </div>
      ) : calls.length === 0 ? (
        <p style={{ padding: "0 1.1rem", color: "var(--muted)", fontSize: "0.85rem" }}>
          No calls yet — calls with your matches will show up here.
        </p>
      ) : (
        <div className="call-history-list">
          {calls.map((call) => (
            <button key={call.id} className="call-row" onClick={() => onOpenMatch(call.match_id)}>
              <div className="call-avatar">{initials(call.other_user_name)}</div>
              <div className="call-body">
                <div className="call-top">
                  <span className="call-name">{call.other_user_name || "Someone"}</span>
                  <span className="call-time">{timeLabel(call.inserted_at)}</span>
                </div>
                <div className={`call-meta ${isMissedForMe(call) ? "missed" : ""}`}>
                  <span className="call-direction">{call.direction === "outgoing" ? "↗" : "↙"}</span>
                  {summaryFor(call)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
