import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";
import ChatRoomView from "../../components/ChatSystem";
import { biziStatusLabel } from "../../constants/biziStatuses";
import "./Bizi.css";

const formatCallTime = (iso) =>
  new Date(iso).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const relativeDayLabel = (iso) => {
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target - today) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays > 1) return `In ${diffDays} days`;
  return "Already happened";
};

function CalendarBadgeIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4M16 3v4" />
    </svg>
  );
}

// A real booked call (Phase D) is structured data on the application
// itself, not buried in the staff-only stage history the applicant
// never sees - this is the one place they'd actually look to find out
// when their call is and how to join it.
function UpcomingCallCard({ scheduledCallAt, meetLink }) {
  if (!scheduledCallAt) return null;

  return (
    <div className="bizi-upcoming-call corner-tick">
      <div className="bizi-upcoming-call-icon">
        <CalendarBadgeIcon />
      </div>
      <div className="bizi-upcoming-call-body">
        <p className="bizi-upcoming-call-label">Upcoming call · {relativeDayLabel(scheduledCallAt)}</p>
        <p className="bizi-upcoming-call-time">{formatCallTime(scheduledCallAt)}</p>
      </div>
      {meetLink && (
        <a href={meetLink} target="_blank" rel="noreferrer" className="btn-primary bizi-upcoming-call-join">
          Join Google Meet
        </a>
      )}
    </div>
  );
}

// The applicant's side of Phase C (bizi_verification_build_plan.md) -
// same room the admin detail view embeds, fetched/created lazily so an
// applicant who never needed it yet doesn't force a chat_rooms row to
// exist before there's anything to say.
export default function BiziVerificationChat({ application, profile, onBack }) {
  const [roomId, setRoomId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch(`/api/bizi_applications/${application.id}/chat_room`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setRoomId(data.chat_room_id))
      .catch(() => setError("Couldn't open the verification chat."));
  }, [application.id]);

  return (
    <div className="bizi-verification-chat-view">
      <div className="bizi-verification-chat-heading">
        <button className="bizi-back-link" onClick={onBack}>&larr; Back to my applications</button>
        <div className="bizi-verification-chat-title-row">
          <h2>{application.company_name}</h2>
          <span className={`match-status-pill ${application.status === "approved" ? "signal" : ""}`}>
            {biziStatusLabel(application.status)}
          </span>
        </div>
        <p className="bizi-verification-chat-subtitle">Verification chat with the Kuzana team</p>
      </div>

      <UpcomingCallCard scheduledCallAt={application.scheduled_call_at} meetLink={application.scheduled_call_meet_link} />

      {error && <div className="panel warn"><p style={{ color: "var(--warn)", margin: 0 }}>{error}</p></div>}

      {roomId && (
        <div className="bizi-verification-chat-panel">
          <ChatRoomView roomId={roomId} matchId={null} profile={profile} partnerName="Kuzana team" />
        </div>
      )}
    </div>
  );
}
