// Per-intro consent step: connecting Calendar here is scoped to THIS
// introduction specifically, separate from any wallet/identity sign-in -
// declining still lets the intro get scheduled, just via manually-entered
// availability instead of a real free/busy lookup.
export default function CalendarConsent({ onConnect, onDecline, busy }) {
  return (
    <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      <p className="panel-label">Escrow-Gated Calendar</p>
      <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.5 }}>
        Connect your Google Calendar for this introduction and we'll find a mutual free slot and put it
        straight on both calendars. This only applies to this one intro - nothing else is ever read or shared.
      </p>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button onClick={onConnect} disabled={busy} className="btn-primary" style={{ padding: "0.7rem 1.4rem" }}>
          {busy ? "Connecting..." : "Connect Google Calendar"}
        </button>
        <button onClick={onDecline} disabled={busy} className="btn-ghost" style={{ padding: "0.7rem 1.4rem" }}>
          Not for this one - I'll enter my availability
        </button>
      </div>
    </div>
  );
}
