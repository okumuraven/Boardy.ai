import { useState, useEffect, useRef, useCallback } from "react";
import CalendarConsent from "./CalendarConsent";
import AvailabilityForm from "./AvailabilityForm";
import DayPicker from "./DayPicker";
import SlotPicker from "./SlotPicker";
import BriefingCard from "./BriefingCard";
import WaitingPanel from "./WaitingPanel";

// Orchestrates the Escrow-Gated Google Calendar flow for one match:
// per-intro consent -> availability (Calendar or manual) -> mutual slot
// proposal + private briefing -> confirmed event. Only ever reachable
// once the match has already unlocked chat (`Vokazi.Scheduling`
// re-checks this server-side regardless of what this component shows).
export default function SchedulingFlow({ matchId, profile, partnerName, onClose }) {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [connectionError, setConnectionError] = useState(false);
  const [oauthBanner, setOauthBanner] = useState("");
  const pollRef = useRef(null);

  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("calendar_connected") === "1") setOauthBanner("Calendar connected for this intro.");
    if (params.get("calendar_connect_error") === "1") setOauthBanner("Couldn't connect Calendar - you can still enter availability manually.");
    if (params.has("calendar_connected") || params.has("calendar_connect_error")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const fetchSchedule = useCallback(
    (showSpinner = false) => {
      if (showSpinner) setLoading(true);
      return fetch(`${apiUrl}/api/matches/${matchId}/schedule?user_id=${profile.id}`)
        .then((res) => res.json())
        .then((data) => {
          setSchedule(data);
          setError("");
          return data;
        })
        .catch(() => setError("Couldn't load scheduling for this intro."))
        .finally(() => showSpinner && setLoading(false));
    },
    [apiUrl, matchId, profile.id]
  );

  useEffect(() => {
    fetchSchedule(true);
  }, [fetchSchedule]);

  useEffect(() => {
    if (!schedule || schedule.status === "confirmed") return;

    pollRef.current = setInterval(() => {
      fetch(`${apiUrl}/api/matches/${matchId}/schedule/status?user_id=${profile.id}`)
        .then((res) => {
          if (!res.ok) throw new Error(`status ${res.status}`);
          return res.json();
        })
        .then((data) => {
          setSchedule(data);
          setConnectionError(false);
        })
        // A network hiccup shouldn't leave the user staring at a silent,
        // unexplained spinner forever - keep retrying, but say so.
        .catch(() => setConnectionError(true));
    }, 6000);

    return () => clearInterval(pollRef.current);
  }, [schedule?.status, apiUrl, matchId, profile.id]);

  const post = (path, body) => {
    setBusy(true);
    return fetch(`${apiUrl}/api/matches/${matchId}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: profile.id, ...body }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setSchedule(data);
        }
        return data;
      })
      .catch(() => setError("Something went wrong - please try again."))
      .finally(() => setBusy(false));
  };

  const connectCalendar = () => {
    setBusy(true);
    fetch(`${apiUrl}/api/matches/${matchId}/schedule/connect_url?user_id=${profile.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.connect_url) window.location.href = data.connect_url;
        else setError(data.error || "Couldn't start Calendar connection.");
      })
      .catch(() => setError("Couldn't start Calendar connection."))
      .finally(() => setBusy(false));
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
        <div className="spinner" style={{ width: "32px", height: "32px", margin: "0 auto 1rem" }}></div>
        Loading scheduling...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1.25rem", overflowY: "auto" }}>
      {oauthBanner && <p style={{ margin: 0, color: "var(--signal)", fontSize: "0.85rem" }}>{oauthBanner}</p>}
      {error && <p style={{ margin: 0, color: "var(--warn)", fontSize: "0.9rem" }}>{error}</p>}

      {schedule?.status === "confirmed" ? (
        <div className="panel" style={{ textAlign: "center", padding: "1.5rem" }}>
          <p className="panel-label">Intro Confirmed</p>
          <p style={{ color: "var(--paper)", fontSize: "1.1rem", margin: "0.5rem 0" }}>
            {new Date(schedule.confirmed_start).toLocaleString([], { weekday: "long", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
          {schedule.google_meet_link && (
            <a href={schedule.google_meet_link} target="_blank" rel="noreferrer" className="btn-primary" style={{ display: "inline-block", marginTop: "0.75rem", padding: "0.7rem 1.4rem", textDecoration: "none" }}>
              Join Google Meet
            </a>
          )}
        </div>
      ) : schedule?.proposed_slots?.length > 0 || schedule?.my_selected_slot ? (
        <>
          <BriefingCard
            briefing={schedule.my_briefing}
            myPreference={schedule.my_contact_preference}
            otherPreference={schedule.other_user?.default_contact_preference}
            partnerName={partnerName}
            onChangePreference={(mode) => post("/schedule/contact_preference", { mode })}
          />
          <SlotPicker
            slots={schedule.proposed_slots}
            mySelectedSlot={schedule.my_selected_slot}
            otherConfirmedOwnSlot={schedule.other_confirmed_own_slot}
            onSelect={(slot) => post("/schedule/select_slot", { slot })}
            busy={busy}
          />
        </>
      ) : schedule?.my_resolved ? (
        <WaitingPanel
          partnerName={partnerName}
          since={schedule.created_at}
          lastReminderSentAt={schedule.last_reminder_sent_at}
          reminderCooldownSeconds={schedule.reminder_cooldown_seconds}
          onRemind={() => post("/schedule/remind", {})}
          busy={busy}
          connectionError={connectionError}
        />
      ) : schedule?.my_consent === true ? (
        <DayPicker
          matchId={matchId}
          profile={profile}
          partnerName={partnerName}
          onSubmit={(slots) => post("/schedule/availability", { slots })}
          busy={busy}
        />
      ) : schedule?.my_consent === false ? (
        <AvailabilityForm onSubmit={(slots) => post("/schedule/availability", { slots })} busy={busy} />
      ) : (
        <CalendarConsent
          onConnect={connectCalendar}
          onDecline={() => post("/schedule/decline_calendar", {})}
          busy={busy}
        />
      )}

      <button onClick={onClose} className="btn-ghost" style={{ alignSelf: "center", padding: "0.5rem 1.2rem", fontSize: "0.85rem" }}>
        ← Back to chat
      </button>
    </div>
  );
}
