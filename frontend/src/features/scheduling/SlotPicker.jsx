const formatSlot = (slot) =>
  new Date(slot.start).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

// Mutual candidate times, computed server-side from both sides'
// availability. Picking one only finalizes the event once the other
// side independently picks the SAME slot - see `Vokazi.Scheduling.select_slot/3`.
export default function SlotPicker({ slots, mySelectedSlot, otherConfirmedOwnSlot, onSelect, busy }) {
  if (mySelectedSlot) {
    return (
      <div className="panel" style={{ textAlign: "center", padding: "1rem" }}>
        <p style={{ margin: "0 0 0.5rem", color: "var(--paper)" }}>You picked {formatSlot(mySelectedSlot)}</p>
        {otherConfirmedOwnSlot ? (
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem" }}>Confirming with the other side...</p>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", color: "var(--muted)", fontSize: "0.9rem" }}>
            <span className="spinner" style={{ width: "18px", height: "18px" }}></span>
            Waiting for them to confirm a time too
          </div>
        )}
      </div>
    );
  }

  if (!slots || slots.length === 0) {
    return (
      <div className="panel" style={{ textAlign: "center", padding: "1rem", color: "var(--muted)" }}>
        <div className="spinner" style={{ width: "22px", height: "22px", margin: "0 auto 0.6rem" }}></div>
        Looking for a mutual free slot...
      </div>
    );
  }

  return (
    <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <p className="panel-label">Pick a time</p>
      {slots.map((slot, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(slot)}
          disabled={busy}
          className="btn-ghost"
          style={{ padding: "0.7rem 1rem", textAlign: "left" }}
        >
          {formatSlot(slot)}
        </button>
      ))}
    </div>
  );
}
