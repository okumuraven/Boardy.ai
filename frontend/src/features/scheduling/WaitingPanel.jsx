const formatElapsed = (since) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return "just now";
};

// Shown once this side has resolved its own step (Calendar connected,
// or manual availability submitted) but the other side hasn't yet -
// makes the wait visible and gives the user something to *do* about it,
// instead of an unexplained spinner. `noOverlap` covers the other case
// that used to look identical to this one: BOTH sides have already
// submitted, but SlotMatcher found no mutual free time at all - that's
// not something a reminder can fix, so it gets its own message and a
// way to actually retry instead of spinning forever.
export default function WaitingPanel({ partnerName, since, lastReminderSentAt, reminderCooldownSeconds, onRemind, onRetry, busy, connectionError, noOverlap }) {
  const cooldownRemaining = lastReminderSentAt
    ? reminderCooldownSeconds - Math.floor((Date.now() - new Date(lastReminderSentAt).getTime()) / 1000)
    : 0;
  const onCooldown = cooldownRemaining > 0;

  if (noOverlap) {
    return (
      <div className="panel" style={{ textAlign: "center", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <p style={{ margin: 0, color: "var(--warn)", fontSize: "0.9rem" }}>
          You and {partnerName || "the other side"} didn't offer any overlapping times.
        </p>
        <button onClick={onRetry} disabled={busy} className="btn-primary" style={{ alignSelf: "center", padding: "0.6rem 1.3rem" }}>
          Offer different times
        </button>
      </div>
    );
  }

  return (
    <div className="panel" style={{ textAlign: "center", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {connectionError ? (
        <p style={{ margin: 0, color: "var(--warn)", fontSize: "0.85rem" }}>
          Having trouble reaching the server - still trying in the background.
        </p>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", color: "var(--muted)" }}>
          <span className="spinner" style={{ width: "18px", height: "18px" }}></span>
          <span>Waiting on {partnerName || "the other side"} - {formatElapsed(since)}</span>
        </div>
      )}

      <button onClick={onRemind} disabled={busy || onCooldown} className="btn-ghost" style={{ padding: "0.5rem 1.1rem", fontSize: "0.85rem", alignSelf: "center" }}>
        {onCooldown ? `Reminder sent - try again in ${Math.ceil(cooldownRemaining / 60)}m` : "👋 Send a reminder"}
      </button>
    </div>
  );
}
