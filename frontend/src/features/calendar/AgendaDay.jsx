import { useState } from "react";

const formatTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const formatClock = (hhmm, date) => new Date(`${date}T${hhmm}:00`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const dayHeaderLabel = (dateKey) => {
  const date = new Date(dateKey + "T00:00:00");
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
};

function CallItem({ item, onOpenMatch }) {
  const [expanded, setExpanded] = useState(false);
  const canPreview = item.my_briefing && (item.status === "confirmed" || item.status === "slot_proposed");
  const name = item.other_user?.name || "them";

  return (
    <div className="agenda-item">
      <div className="agenda-item-row">
        <span className="agenda-item-time">{formatTime(item.time)}</span>
        <div className="agenda-item-body">
          <span className="agenda-item-title">
            {item.status === "confirmed" ? "📞 " : ""}
            {item.status === "confirmed" ? `Call with ${name}` : `Proposed · with ${name}`}
          </span>
          {item.status === "slot_proposed" && <span className="agenda-item-sub">Waiting on both sides to pick the same slot</span>}
        </div>
        <div className="agenda-item-actions">
          {item.status === "confirmed" && item.google_meet_link && (
            <a href={item.google_meet_link} target="_blank" rel="noreferrer" className="btn-primary" style={{ padding: "0.35rem 0.8rem", fontSize: "0.78rem", textDecoration: "none" }}>
              Join
            </a>
          )}
          <button onClick={() => onOpenMatch?.(item.match_id)} className="btn-ghost" style={{ padding: "0.35rem 0.8rem", fontSize: "0.78rem" }}>
            {item.status === "confirmed" ? "View in chat" : "Pick a time"}
          </button>
        </div>
      </div>

      {canPreview && (
        <>
          <button onClick={() => setExpanded((v) => !v)} className="calendar-card-briefing-toggle">
            {expanded ? "▾" : "▸"} Before you talk to {name}
          </button>
          {expanded && (
            <div className="calendar-card-briefing">
              {item.my_briefing.summary && <p>{item.my_briefing.summary}</p>}
              {item.my_briefing.talking_points?.length > 0 && (
                <ul>
                  {item.my_briefing.talking_points.map((point, idx) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PersonalItem({ item, onDelete }) {
  return (
    <div className="agenda-item">
      <div className="agenda-item-row">
        <span className="agenda-item-time">{formatClock(item.start_time, item.date)}</span>
        <div className="agenda-item-body">
          <span className="agenda-item-title">{item.title}</span>
          <span className="agenda-item-sub">
            {formatClock(item.start_time, item.date)} – {formatClock(item.end_time, item.date)}
          </span>
        </div>
        <div className="agenda-item-actions">
          <button onClick={() => onDelete?.(item.id)} className="agenda-item-delete" aria-label={`Remove ${item.title}`}>
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

// One day's worth of the unified agenda - Kuzana Connect calls (confirmed or
// still-proposed) interleaved with the user's own personal events,
// chronological within the day. Personal events are the only ones with
// a delete affordance - calls are managed from the match itself.
export default function AgendaDay({ dateKey, items, onOpenMatch, onDeletePersonalEvent }) {
  return (
    <div className="agenda-day">
      <h3 className="agenda-day-header">{dayHeaderLabel(dateKey)}</h3>
      {items.map((item) =>
        item.kind === "personal" ? (
          <PersonalItem key={`p-${item.id}`} item={item} onDelete={onDeletePersonalEvent} />
        ) : (
          <CallItem key={`c-${item.match_id}-${item.status}`} item={item} onOpenMatch={onOpenMatch} />
        )
      )}
    </div>
  );
}
