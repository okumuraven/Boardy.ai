// Per-intro consent step: connecting Calendar here is scoped to THIS
// introduction specifically, separate from any wallet/identity sign-in -
// declining still lets the intro get scheduled, just via manually-entered
// availability instead of a real free/busy lookup.
export default function CalendarConsent({ onConnect, onDecline, busy }) {
  return (
    <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      <p className="panel-label">Schedule this intro</p>
      <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.5 }}>
        Connect your Google Calendar for this introduction and we'll find a mutual free slot and put it
        straight on both calendars. This only applies to this one intro - nothing else is ever read or shared.
      </p>
      {/* Google's own review of this app is still in progress (a
          multi-week process, paused for now) - every user hits its
          generic "unverified app" warning when connecting Calendar
          until that finishes. Explaining it here, before they see it,
          turns a scary-looking dead end into an expected extra click -
          the warning itself can't be removed without finishing
          verification, but the fear around it can be. */}
      <div style={{ background: "var(--ink-raised)", border: "1px solid var(--ink-line)", borderRadius: "8px", padding: "0.7rem 0.9rem" }}>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.8rem", lineHeight: 1.55 }}>
          ⚠️ Google may show a "hasn't verified this app" notice first - that's expected while we're still
          going through Google's review, not a sign anything's wrong. Tap <strong style={{ color: "var(--paper)" }}>Advanced</strong>, then{" "}
          <strong style={{ color: "var(--paper)" }}>Go to Kuzana Connect (unsafe)</strong> to continue. We only ever request access to check
          free/busy time and create this one event - never anything else on your account.
        </p>
      </div>
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
