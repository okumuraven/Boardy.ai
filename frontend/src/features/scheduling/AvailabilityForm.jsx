import { useState } from "react";

// Manual fallback when a side declines/lacks Calendar access - a simple
// list of date/time windows, submitted as-is to the backend's mutual
// slot matcher.
export default function AvailabilityForm({ onSubmit, busy }) {
  const [rows, setRows] = useState([{ date: "", start: "", end: "" }]);

  const updateRow = (idx, field, value) => {
    setRows((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  };

  const addRow = () => setRows((prev) => [...prev, { date: "", start: "", end: "" }]);
  const removeRow = (idx) => setRows((prev) => prev.filter((_, i) => i !== idx));

  const validRows = rows.filter((r) => r.date && r.start && r.end);

  return (
    <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      <p className="panel-label">When are you free?</p>
      {rows.map((row, idx) => (
        <div key={idx} style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <input type="date" value={row.date} onChange={(e) => updateRow(idx, "date", e.target.value)} className="chat-input" style={{ flex: "1 1 140px" }} />
          <input type="time" value={row.start} onChange={(e) => updateRow(idx, "start", e.target.value)} className="chat-input" style={{ flex: "1 1 100px" }} />
          <span style={{ color: "var(--muted)" }}>to</span>
          <input type="time" value={row.end} onChange={(e) => updateRow(idx, "end", e.target.value)} className="chat-input" style={{ flex: "1 1 100px" }} />
          {rows.length > 1 && (
            <button onClick={() => removeRow(idx)} className="btn-ghost" style={{ padding: "0.4rem 0.7rem" }}>
              ✕
            </button>
          )}
        </div>
      ))}

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button onClick={addRow} className="btn-ghost" style={{ padding: "0.6rem 1.1rem" }}>
          + Add another window
        </button>
        <button
          onClick={() => onSubmit(validRows)}
          disabled={busy || validRows.length === 0}
          className="btn-primary"
          style={{ padding: "0.6rem 1.4rem" }}
        >
          {busy ? "Saving..." : "Submit availability"}
        </button>
      </div>
    </div>
  );
}
