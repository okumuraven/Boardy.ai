import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";
import ChatRoomView from "../../components/ChatSystem";

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
    <div>
      <button className="admin-back-link" onClick={onBack}>&larr; Back to my applications</button>

      <h2 style={{ color: "var(--paper)", marginBottom: "0.25rem" }}>{application.company_name}</h2>
      <p style={{ color: "var(--muted)", marginBottom: "1.25rem" }}>Verification chat with the Kuzana team</p>

      {error && <div className="panel warn"><p style={{ color: "var(--warn)", margin: 0 }}>{error}</p></div>}

      {roomId && (
        <div className="bizi-verification-chat">
          <ChatRoomView roomId={roomId} matchId={null} profile={profile} partnerName="Kuzana team" />
        </div>
      )}
    </div>
  );
}
