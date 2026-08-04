import { useState, useEffect, useRef } from "react";
import { Socket } from "phoenix";
import { getToken } from "../../lib/api";
import "./IncomingCallBanner.css";

// Makes an incoming call visible from anywhere in the app - not just
// when the specific match's chat happens to be open (see CallPanel.jsx,
// which is scoped to one chat_room channel). Connects to the same kind
// of always-on personal channel (`user:{id}`) NotificationBell already
// keeps open for the notification bell, so this survives every tab
// switch the same way. Deliberately dumb: no WebRTC/channel logic here
// at all - tapping it just navigates to the right chat, where the real
// Accept/Decline UI (CallPanel) takes over, re-surfaced automatically by
// the backend's after-join ring re-push (chat_room_channel.ex).
export default function IncomingCallBanner({ profile, onAnswer }) {
  const [incoming, setIncoming] = useState(null);
  const callIdRef = useRef(null);

  useEffect(() => {
    if (!profile?.id) return;

    const apiUrl = import.meta.env.VITE_API_URL;
    const socketUrl = `${apiUrl.replace(/^http/, "ws")}/socket`;
    const socket = new Socket(socketUrl, { params: { token: getToken() } });
    socket.connect();

    const channel = socket.channel(`user:${profile.id}`, {});

    channel.on("call_ring", (payload) => {
      callIdRef.current = payload.call_id;
      setIncoming({ matchId: payload.match_id, fromName: payload.from_name });
    });

    // Any resolution path other than the callee tapping the banner
    // itself (which clears its own state immediately) should dismiss it
    // - otherwise it can linger showing a call that's already done.
    const clearIfCurrent = ({ call_id }) => {
      if (call_id === callIdRef.current) {
        callIdRef.current = null;
        setIncoming(null);
      }
    };
    ["call_accepted", "call_declined", "call_cancelled", "call_timeout"].forEach((event) =>
      channel.on(event, clearIfCurrent)
    );

    channel.join();

    return () => {
      channel.leave();
      socket.disconnect();
    };
  }, [profile?.id]);

  if (!incoming) return null;

  const handleAnswer = () => {
    const matchId = incoming.matchId;
    callIdRef.current = null;
    setIncoming(null);
    onAnswer(matchId);
  };

  return (
    <button className="incoming-call-banner" onClick={handleAnswer}>
      <span className="incoming-call-banner-icon">📞</span>
      {incoming.fromName || "Someone"} is calling · tap to answer
    </button>
  );
}
