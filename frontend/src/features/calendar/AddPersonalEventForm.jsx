import { useState } from "react";

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Slim inline form (not a modal) for adding a personal agenda item -
// anything outside a Vokazi-scheduled call. Native date/time inputs
// give a solid mobile keyboard/picker for free without a custom widget.
export default function AddPersonalEventForm({ prefilledDate, onSubmit, onCancel }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(prefilledDate || todayIso());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!title.trim()) return setError("Give it a title.");
    if (endTime <= startTime) return setError("End time has to be after the start time.");
    setError("");
    setBusy(true);
    Promise.resolve(onSubmit({ title: title.trim(), date, start_time: startTime, end_time: endTime }))
      .catch(() => setError("Couldn't save that - try again."))
      .finally(() => setBusy(false));
  };

  return (
    <form onSubmit={submit} className="add-event-form">
      {error && <p className="add-event-form-error">{error}</p>}
      <input
        type="text"
        placeholder="What's this? (e.g. Dentist appointment)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="add-event-form-title"
        autoFocus
      />
      <div className="add-event-form-row">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        <span className="add-event-form-dash">–</span>
        <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
      </div>
      <div className="add-event-form-actions">
        <button type="button" onClick={onCancel} className="btn-ghost" style={{ padding: "0.45rem 1rem", fontSize: "0.82rem" }}>
          Cancel
        </button>
        <button type="submit" disabled={busy} className="btn-primary" style={{ padding: "0.45rem 1rem", fontSize: "0.82rem" }}>
          {busy ? "Adding..." : "Add to calendar"}
        </button>
      </div>
    </form>
  );
}
