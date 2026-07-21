import { useState, useEffect } from "react";
import MiniCalendar from "./MiniCalendar";
import { dateKeyFromDate } from "./dateKey";

const formatConfirmed = (iso) =>
  new Date(iso).toLocaleString([], { weekday: "long", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

const cardContent = (schedule) => {
  if (schedule.status === "confirmed") {
    return { when: formatConfirmed(schedule.confirmed_start), status: "Confirmed", action: "View in chat" };
  }
  if (schedule.status === "slot_proposed") {
    return {
      when: `${schedule.proposed_slots.length} time${schedule.proposed_slots.length === 1 ? "" : "s"} proposed`,
      status: "Waiting on both sides to pick the same slot.",
      action: "Pick a time",
    };
  }
  if (schedule.status === "not_started") {
    return { when: "Not yet scheduled", status: "Opens once you start it from the conversation.", action: "Start scheduling" };
  }
  return { when: "In progress", status: "Waiting on availability details from one or both sides.", action: "Open chat" };
};

// A real cross-match view - Vokazi.Scheduling.CalendarOverview aggregates
// every unlocked match's scheduling state, since day-to-day scheduling
// itself still happens per-match inside the Matches tab.
export default function CalendarView({ profile, onOpenMatch }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (!profile?.id) return;
    setLoading(true);
    fetch(`${apiUrl}/api/schedules?user_id=${profile.id}`)
      .then((res) => res.json())
      .then((data) => setSchedules(data.schedules || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profile?.id, apiUrl]);

  if (loading) {
    return (
      <div className="calendar-view-placeholder">
        <div className="spinner" style={{ width: "28px", height: "28px" }}></div>
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="calendar-view-placeholder">
        <h2>Your Schedule</h2>
        <p>Nothing to show yet - once a match unlocks, its intro call scheduling will appear here.</p>
      </div>
    );
  }

  // Real dates only - confirmed calls, and every day still in play for a
  // proposed-but-unconfirmed slot. Nothing illustrative.
  const eventDates = new Set();
  schedules.forEach((schedule) => {
    if (schedule.status === "confirmed" && schedule.confirmed_start) {
      eventDates.add(dateKeyFromDate(new Date(schedule.confirmed_start)));
    }
    if (schedule.status === "slot_proposed") {
      schedule.proposed_slots.forEach((slot) => eventDates.add(dateKeyFromDate(new Date(slot.start))));
    }
  });

  return (
    <div className="calendar-view">
      <MiniCalendar eventDates={eventDates} />

      <div className="calendar-list">
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "1.6rem", margin: "0 0 1.5rem" }}>Your Schedule</h1>
        {schedules.map((schedule) => {
          const { when, status, action } = cardContent(schedule);
          return (
            <div key={schedule.match_id} className={`calendar-card ${schedule.status === "not_started" ? "not-started" : ""}`}>
              <div className="top">
                <span className="with">{schedule.other_user?.name || "Someone"}</span>
                <span className="when">{when}</span>
              </div>
              <div className="status-line">{status}</div>
              <div className="card-actions">
                {schedule.status === "confirmed" && schedule.google_meet_link && (
                  <a href={schedule.google_meet_link} target="_blank" rel="noreferrer" className="btn-primary" style={{ padding: "0.4rem 0.9rem", fontSize: "0.8rem", textDecoration: "none" }}>
                    Join Google Meet
                  </a>
                )}
                <button onClick={() => onOpenMatch?.(schedule.match_id)} className="btn-ghost" style={{ padding: "0.4rem 0.9rem", fontSize: "0.8rem" }}>
                  {action}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
