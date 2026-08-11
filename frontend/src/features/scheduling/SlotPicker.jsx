import { useState, useEffect } from "react";

const formatSlot = (slot) =>
  new Date(slot.start).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

// Mutual candidate times, computed server-side from both sides'
// availability. Picking one only finalizes the event once the other
// side independently picks the SAME slot - see `Vokazi.Scheduling.select_slot/3`.
// If both sides pick different slots, the backend clears both picks on
// the next poll so this component naturally falls back to the list
// below on its own - but a person shouldn't have to wait up to 6
// seconds (or wonder if they're stuck) just to change their own mind,
// so "Change your pick" re-opens the list immediately, client-side.
export default function SlotPicker({ slots, mySelectedSlot, otherConfirmedOwnSlot, onSelect, busy }) {
  const [changingPick, setChangingPick] = useState(false);

  // A fresh selection (ours or, via the server-side reconciliation, a
  // reset back to none) always cancels any in-progress "changing pick" -
  // otherwise picking a new time here would render both the confirmation
  // panel below and momentarily-stale list at once. Keyed on the slot's
  // actual start/end, not object identity - the 6s status poll returns a
  // brand new object every time even when the underlying pick hasn't
  // changed, which would otherwise silently boot the user out of
  // "changing pick" mode mid-decision.
  const slotKey = mySelectedSlot ? `${mySelectedSlot.start}|${mySelectedSlot.end}` : null;
  useEffect(() => {
    setChangingPick(false);
  }, [slotKey]);

  if (mySelectedSlot && !changingPick) {
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
        <button
          onClick={() => setChangingPick(true)}
          disabled={busy}
          className="btn-ghost"
          style={{ marginTop: "0.85rem", padding: "0.4rem 1rem", fontSize: "0.85rem" }}
        >
          Change your pick
        </button>
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
