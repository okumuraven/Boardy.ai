import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";
import { presetDays, bestDefaultWindow, windowToClock, windowLabel, dayRangeLabel, formatDayLabel, dayPhrase } from "./availabilityWindows";

// One simple day/time picker for offering availability for this intro
// (Vokazi.Scheduling.submit_manual_availability/3), used regardless of
// whether this side connected Calendar - replaces what used to be two
// entirely different screens (a real-free-time day picker vs. a typed
// multi-row date/time form). Calendar-connected users tap from their
// own REAL free windows (Vokazi.Scheduling.MyFreeDays); everyone else
// taps from the same fixed set of time blocks. Same screen, same
// tap-to-select interaction, same submit button either way - only
// where a day's "windows" come from differs.
export default function AvailabilityPicker({ matchId, profile, calendarConnected, partnerName, onSubmit, busy }) {
  const [days, setDays] = useState(calendarConnected ? [] : presetDays());
  const [loading, setLoading] = useState(calendarConnected);
  const [loadError, setLoadError] = useState("");
  const [needsReauth, setNeedsReauth] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [selected, setSelected] = useState({}); // date -> {start, end} ("HH:MM" clock strings)

  useEffect(() => {
    if (!calendarConnected) return;
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
  }, [matchId, profile.id, calendarConnected]);

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
        next[day.date] = windowToClock(bestDefaultWindow(day));
      }
      return next;
    });
  };

  const chooseWindow = (date, window) => {
    setSelected((prev) => ({ ...prev, [date]: windowToClock(window) }));
  };

  const submit = () => {
    const slots = Object.entries(selected).map(([date, w]) => ({ date, start: w.start, end: w.end }));
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
        {calendarConnected
          ? "These are your real free times over the next few days. Pick the ones you're offering for this intro - the other side only ever sees what you choose here, never your full calendar."
          : "Tap a day, then a time block that works for you - we'll match it against theirs automatically."}
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
                ✓ {partnerName || "They"} {partnerName ? "is" : "are"} also free {dayPhrase(day.date)}, {windowLabel(day.other_offered)}
              </p>
            )}
            <button
              onClick={() => hasFreeTime && toggleDay(day)}
              disabled={!hasFreeTime}
              className={isSelected ? "btn-primary" : "btn-ghost"}
              style={{ width: "100%", justifyContent: "space-between", display: "flex", padding: "0.6rem 0.9rem", fontSize: "0.85rem" }}
            >
              <span>{formatDayLabel(day.date)}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>{dayRangeLabel(day)}</span>
            </button>

            {isSelected && day.windows.length > 1 && (
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.4rem", paddingLeft: "0.5rem" }}>
                {day.windows.map((w, i) => (
                  <button
                    key={i}
                    onClick={() => chooseWindow(day.date, w)}
                    className="pref-pill"
                    style={windowToClock(w).start === selected[day.date]?.start ? { borderColor: "var(--brass)", color: "var(--brass)" } : undefined}
                  >
                    {windowLabel(w)}
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
