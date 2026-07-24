import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";

const formatDayLabel = (dateStr) => {
  const date = new Date(dateStr + "T00:00:00");
  const isToday = date.toDateString() === new Date().toDateString();
  const weekday = date.toLocaleDateString([], { weekday: "short" });
  const md = date.toLocaleDateString([], { month: "short", day: "numeric" });
  return isToday ? `Today · ${md}` : `${weekday} · ${md}`;
};

const formatTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const toClock = (iso) => new Date(iso).toISOString().slice(11, 16);

// Grammatical form for inline use ("is also free {dayPhrase}") - reads
// naturally next to a time range instead of the bare "Today · Jul 20"
// label used on the day buttons themselves.
const dayPhrase = (dateStr) => {
  const date = new Date(dateStr + "T00:00:00");
  if (date.toDateString() === new Date().toDateString()) return "today";
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
};

// The window to default-select for a day: if the other side already
// offered a window on this same date, prefer wherever the two windows
// actually overlap - that's the slice of time most likely to survive
// the later mutual-intersection step, so defaulting to it saves a
// round trip instead of picking blind and hoping it overlaps.
const bestDefaultWindow = (day) => {
  if (day.other_offered) {
    const otherStart = new Date(day.other_offered.start).getTime();
    const otherEnd = new Date(day.other_offered.end).getTime();
    for (const w of day.windows) {
      const start = Math.max(new Date(w.start).getTime(), otherStart);
      const end = Math.min(new Date(w.end).getTime(), otherEnd);
      if (start < end) return { start: new Date(start).toISOString(), end: new Date(end).toISOString() };
    }
  }
  return day.windows[0];
};

// Shown once Calendar connects - your REAL free days for the next few
// days (Vokazi.Scheduling.MyFreeDays), so you explicitly pick which
// ones to offer instead of the system silently using every free
// minute. Submits through the same endpoint a manual user uses, so
// both paths land in the same place. Days the other side has already
// offered are surfaced and sorted first, so picking one of those is
// the fast path to an actual mutual match instead of two independently
// chosen, disjoint sets.
export default function DayPicker({ matchId, profile, partnerName, onSubmit, busy }) {
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [needsReauth, setNeedsReauth] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [selected, setSelected] = useState({}); // date -> {start, end} (ISO)

  useEffect(() => {
    apiFetch(`/api/matches/${matchId}/schedule/my_free_days`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error === "calendar_reauth_required") {
          setNeedsReauth(true);
          setLoadError(data.message || "Your Calendar connection needs to be renewed.");
        } else if (data.error) {
          setLoadError(data.error);
        } else {
          setDays(data.days || []);
        }
      })
      .catch(() => setLoadError("Couldn't load your calendar."))
      .finally(() => setLoading(false));
  }, [matchId, profile.id]);

  const reconnectCalendar = () => {
    setReconnecting(true);
    apiFetch(`/api/matches/${matchId}/schedule/connect_url`)
      .then((res) => res.json())
      .then((data) => {
        if (data.connect_url) window.location.href = data.connect_url;
        else setLoadError(data.error || "Couldn't start Calendar reconnection.");
      })
      .catch(() => setLoadError("Couldn't start Calendar reconnection."))
      .finally(() => setReconnecting(false));
  };

  const toggleDay = (day) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[day.date]) {
        delete next[day.date];
      } else {
        const w = bestDefaultWindow(day);
        next[day.date] = { start: w.start, end: w.end };
      }
      return next;
    });
  };

  const chooseWindow = (date, window) => {
    setSelected((prev) => ({ ...prev, [date]: { start: window.start, end: window.end } }));
  };

  const submit = () => {
    const slots = Object.entries(selected).map(([date, w]) => ({
      date,
      start: toClock(w.start),
      end: toClock(w.end),
    }));
    onSubmit(slots);
  };

  const selectedCount = Object.keys(selected).length;
  const sortedDays = [...days].sort((a, b) => {
    if (!!a.other_offered !== !!b.other_offered) return a.other_offered ? -1 : 1;
    return a.date.localeCompare(b.date);
  });
  const anyOverlap = days.some((d) => d.other_offered);

  if (loading) {
    return (
      <div className="panel" style={{ textAlign: "center", padding: "1rem" }}>
        <div className="spinner" style={{ width: "22px", height: "22px", margin: "0 auto" }}></div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="panel warn" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <p className="panel-label warn">{loadError}</p>
        {needsReauth && (
          <button onClick={reconnectCalendar} disabled={reconnecting} className="btn-primary">
            {reconnecting ? "Opening Google..." : "Reconnect Google Calendar"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      <p className="panel-label">Which days work for you?</p>
      <p style={{ fontSize: "0.8rem", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
        These are your real free times over the next few days. Pick the ones you're offering for this
        intro - the other side only ever sees what you choose here, never your full calendar.
        {anyOverlap && ` Days marked below already work for ${partnerName || "the other person"} too - picking one gets you both to a call fastest.`}
      </p>

      {days.length > 0 && days.every((d) => d.windows.length === 0) && (
        <p style={{ fontSize: "0.85rem", color: "var(--warn)", margin: 0 }}>You're fully booked over the next few days.</p>
      )}

      {sortedDays.map((day) => {
        const isSelected = !!selected[day.date];
        const hasFreeTime = day.windows.length > 0;
        return (
          <div key={day.date} style={{ opacity: hasFreeTime ? 1 : 0.4 }}>
            {day.other_offered && (
              <p style={{ margin: "0 0 0.3rem 0.1rem", fontSize: "0.72rem", color: "var(--signal)" }}>
                ✓ {partnerName || "They"} {partnerName ? "is" : "are"} also free {dayPhrase(day.date)}, {formatTime(day.other_offered.start)}–{formatTime(day.other_offered.end)}
              </p>
            )}
            <button
              onClick={() => hasFreeTime && toggleDay(day)}
              disabled={!hasFreeTime}
              className={isSelected ? "btn-primary" : "btn-ghost"}
              style={{ width: "100%", justifyContent: "space-between", display: "flex", padding: "0.6rem 0.9rem", fontSize: "0.85rem" }}
            >
              <span>{formatDayLabel(day.date)}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
                {hasFreeTime ? `${formatTime(day.windows[0].start)}–${formatTime(day.windows[day.windows.length - 1].end)}` : "Busy all day"}
              </span>
            </button>

            {isSelected && day.windows.length > 1 && (
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.4rem", paddingLeft: "0.5rem" }}>
                {day.windows.map((w, i) => (
                  <button
                    key={i}
                    onClick={() => chooseWindow(day.date, w)}
                    className="pref-pill"
                    style={
                      selected[day.date]?.start === w.start
                        ? { borderColor: "var(--brass)", color: "var(--brass)" }
                        : undefined
                    }
                  >
                    {formatTime(w.start)}–{formatTime(w.end)}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <button onClick={submit} disabled={busy || selectedCount === 0} className="btn-primary" style={{ marginTop: "0.4rem" }}>
        {busy ? "Submitting..." : selectedCount === 0 ? "Select at least one day" : `Offer ${selectedCount} day${selectedCount === 1 ? "" : "s"}`}
      </button>
    </div>
  );
}
