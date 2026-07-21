import { useState, useEffect, useCallback } from "react";
import MiniCalendar from "./MiniCalendar";
import AgendaDay from "./AgendaDay";
import AddPersonalEventForm from "./AddPersonalEventForm";
import { dateKeyFromDate } from "./dateKey";

// Turns the raw /api/schedules + /api/personal_events responses into a
// flat list of dated agenda items - one entry per confirmed call, one
// per still-proposed match (anchored to its earliest candidate slot),
// one per personal event. Matches with no date yet (nothing proposed,
// nobody's connected Calendar) have nothing to anchor a day to, so they
// don't belong in a day-by-day agenda - callers surface those separately.
const toAgendaItems = (schedules, personalEvents) => {
  const items = [];

  schedules.forEach((schedule) => {
    if (schedule.status === "confirmed" && schedule.confirmed_start) {
      items.push({ kind: "call", date: dateKeyFromDate(new Date(schedule.confirmed_start)), time: schedule.confirmed_start, ...schedule });
    } else if (schedule.status === "slot_proposed" && schedule.proposed_slots.length > 0) {
      const earliest = [...schedule.proposed_slots].sort((a, b) => a.start.localeCompare(b.start))[0];
      items.push({ kind: "call", date: dateKeyFromDate(new Date(earliest.start)), time: earliest.start, ...schedule });
    }
  });

  personalEvents.forEach((event) => {
    items.push({ kind: "personal", date: event.date, time: `${event.date}T${event.start_time}`, ...event });
  });

  return items;
};

const groupByDate = (items) => {
  const byDate = new Map();
  [...items]
    .sort((a, b) => a.time.localeCompare(b.time))
    .forEach((item) => {
      if (!byDate.has(item.date)) byDate.set(item.date, []);
      byDate.get(item.date).push(item);
    });
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
};

// A real cross-match view - Vokazi.Scheduling.CalendarOverview aggregates
// every unlocked match's scheduling state, since day-to-day scheduling
// itself still happens per-match inside the Matches tab. Merged with
// the user's own personal events into one chronological "what's on my
// plate" agenda - the thing someone in a hurry actually wants to read.
export default function CalendarView({ profile, onOpenMatch }) {
  const [schedules, setSchedules] = useState([]);
  const [personalEvents, setPersonalEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [addingEvent, setAddingEvent] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL;

  const userId = profile?.id;

  const refetch = useCallback(() => {
    if (!userId) return Promise.resolve();
    return Promise.all([
      fetch(`${apiUrl}/api/schedules?user_id=${userId}`).then((res) => res.json()),
      fetch(`${apiUrl}/api/personal_events?user_id=${userId}`).then((res) => res.json()),
    ]).then(([schedulesData, eventsData]) => {
      setSchedules(schedulesData.schedules || []);
      setPersonalEvents(eventsData.events || []);
    });
  }, [userId, apiUrl]);

  useEffect(() => {
    setLoading(true);
    refetch()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refetch]);

  const addPersonalEvent = (attrs) =>
    fetch(`${apiUrl}/api/personal_events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: profile.id, ...attrs }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setAddingEvent(false);
        return refetch();
      });

  const deletePersonalEvent = (id) =>
    fetch(`${apiUrl}/api/personal_events/${id}?user_id=${profile.id}`, { method: "DELETE" }).then(refetch);

  if (loading) {
    return (
      <div className="calendar-view-placeholder">
        <div className="spinner" style={{ width: "28px", height: "28px" }}></div>
      </div>
    );
  }

  const notStarted = schedules.filter((s) => s.status === "not_started" || s.status === "in_progress");
  const agendaItems = toAgendaItems(schedules, personalEvents);
  const isEmpty = agendaItems.length === 0 && notStarted.length === 0;

  const eventDates = new Set(agendaItems.map((item) => item.date));
  const groupedDays = groupByDate(agendaItems).filter(([date]) => !selectedDate || date === selectedDate);

  return (
    <div className="calendar-view">
      <MiniCalendar eventDates={eventDates} selectedDate={selectedDate} onSelectDate={setSelectedDate} />

      <div className="calendar-list">
        <div className="calendar-list-head">
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "1.6rem", margin: 0 }}>Your Agenda</h1>
          {!addingEvent && (
            <button onClick={() => setAddingEvent(true)} className="btn-ghost" style={{ padding: "0.4rem 0.9rem", fontSize: "0.8rem" }}>
              + Add to your calendar
            </button>
          )}
        </div>

        {addingEvent && (
          <AddPersonalEventForm prefilledDate={selectedDate} onSubmit={addPersonalEvent} onCancel={() => setAddingEvent(false)} />
        )}

        {selectedDate && (
          <button onClick={() => setSelectedDate(null)} className="agenda-clear-filter">
            ← Showing {selectedDate} only · Show everything
          </button>
        )}

        {isEmpty && (
          <p className="calendar-view-empty-note">
            Nothing to show yet - once a match unlocks, its intro call scheduling will appear here, or add something of your own above.
          </p>
        )}

        {groupedDays.map(([date, items]) => (
          <AgendaDay key={date} dateKey={date} items={items} onOpenMatch={onOpenMatch} onDeletePersonalEvent={deletePersonalEvent} />
        ))}

        {!selectedDate && notStarted.length > 0 && (
          <div className="agenda-day">
            <h3 className="agenda-day-header">Not yet scheduled</h3>
            {notStarted.map((schedule) => (
              <div key={schedule.match_id} className="agenda-item">
                <div className="agenda-item-row">
                  <div className="agenda-item-body">
                    <span className="agenda-item-title">{schedule.other_user?.name || "Someone"}</span>
                    <span className="agenda-item-sub">
                      {schedule.status === "not_started" ? "Opens once you start it from the conversation." : "Waiting on availability details from one or both sides."}
                    </span>
                  </div>
                  <div className="agenda-item-actions">
                    <button onClick={() => onOpenMatch?.(schedule.match_id)} className="btn-ghost" style={{ padding: "0.35rem 0.8rem", fontSize: "0.78rem" }}>
                      {schedule.status === "not_started" ? "Start scheduling" : "Open chat"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
