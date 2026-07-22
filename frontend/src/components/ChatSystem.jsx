import { useState, useEffect, useRef, useCallback } from "react";
import { Socket, Presence } from "phoenix";
import SchedulingFlow from "../features/scheduling";
import MatchProfilePanel from "../features/matches/MatchProfilePanel";

const HISTORY_PAGE_SIZE = 50;

export default function ChatRoomView({ roomId, matchId, profile, partnerName, startInScheduling, onBack }) {
  // One docked side panel, not two competing ones - `null | "schedule" |
  // "profile"`. Opens straight into scheduling when a calendar-reminder
  // notification click asked for it (`startInScheduling`), or when we're
  // landing back here right after Google's OAuth redirect (a full page
  // navigation, so any prior React state was lost) - SchedulingFlow reads
  // the same query params to show a connect success/error banner before
  // clearing them.
  const [panelView, setPanelView] = useState(() => {
    if (startInScheduling) return "schedule";
    const params = new URLSearchParams(window.location.search);
    return params.has("calendar_connected") || params.has("calendar_connect_error") ? "schedule" : null;
  });
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [connectionState, setConnectionState] = useState("connecting"); // connecting | joined | error
  const [joinError, setJoinError] = useState("");
  const [otherOnline, setOtherOnline] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const socketRef = useRef(null);
  const channelRef = useRef(null);
  const presenceStateRef = useRef({});
  const messagesEndRef = useRef(null);
  const shouldScrollRef = useRef(true);

  useEffect(() => {
    if (shouldScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    shouldScrollRef.current = true;
  }, [messages]);

  const updatePresence = useCallback(() => {
    const online = Presence.list(presenceStateRef.current).some((p) => p.id !== String(profile.id));
    setOtherOnline(online);
  }, [profile.id]);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const socketUrl = `${apiUrl.replace(/^http/, "ws")}/socket`;
    const socket = new Socket(socketUrl, { params: { user_id: profile.id } });
    socket.connect();
    socketRef.current = socket;

    const channel = socket.channel(`chat_room:${roomId}`, {});
    channelRef.current = channel;

    channel.on("history", ({ messages: history }) => {
      setMessages(history);
      setHasMoreHistory(history.length >= HISTORY_PAGE_SIZE);
    });

    channel.on("new_msg", (message) => {
      shouldScrollRef.current = true;
      setMessages((prev) => [...prev, message]);
    });

    channel.on("presence_state", (state) => {
      presenceStateRef.current = Presence.syncState(presenceStateRef.current, state);
      updatePresence();
    });

    channel.on("presence_diff", (diff) => {
      presenceStateRef.current = Presence.syncDiff(presenceStateRef.current, diff);
      updatePresence();
    });

    channel
      .join()
      .receive("ok", () => setConnectionState("joined"))
      .receive("error", ({ reason }) => {
        setConnectionState("error");
        setJoinError(
          reason === "unauthorized"
            ? "You're not a participant in this chat."
            : "This chat room couldn't be found."
        );
      });

    return () => {
      channel.leave();
      socket.disconnect();
    };
  }, [roomId, profile.id, updatePresence]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content || connectionState !== "joined") return;

    channelRef.current
      ?.push("new_msg", { content })
      .receive("error", ({ reason }) => alert(reason || "Message failed to send."));

    setNewMessage("");
  };

  const handleLoadMore = () => {
    const earliest = messages[0];
    if (!earliest || loadingMore) return;

    setLoadingMore(true);
    shouldScrollRef.current = false;
    channelRef.current
      ?.push("load_more", { before_id: earliest.id })
      .receive("ok", ({ messages: older }) => {
        setMessages((prev) => [...older, ...prev]);
        setHasMoreHistory(older.length >= HISTORY_PAGE_SIZE);
        setLoadingMore(false);
      })
      .receive("error", () => {
        setHasMoreHistory(false);
        setLoadingMore(false);
      })
      .receive("timeout", () => setLoadingMore(false));
  };

  return (
    <div className="chat-panel animate-in">
      <div className="chat-column">

        {/* Header */}
        <div className="chat-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button onClick={onBack} className="nav-link" style={{ fontSize: '1.2rem', marginRight: '1rem' }}>
              ←
            </button>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.3rem', margin: 0, color: 'var(--paper)' }}>{partnerName || "Your match"}</h2>
              <span style={{ fontSize: '0.8rem', color: otherOnline ? 'var(--signal)' : 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span className={`dot ${otherOnline ? 'online' : ''}`}></span>
                {connectionState === "joined" ? (otherOnline ? "Online now" : "Offline") : connectionState === "error" ? "Connection failed" : "Connecting..."}
              </span>
            </div>
          </div>
          {matchId && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setPanelView((v) => (v === "profile" ? null : "profile"))}
                className={panelView === "profile" ? "btn-primary" : "btn-ghost"}
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                {panelView === "profile" ? "Hide Profile" : `View ${partnerName || "Profile"}`}
              </button>
              <button
                onClick={() => setPanelView((v) => (v === "schedule" ? null : "schedule"))}
                className={panelView === "schedule" ? "btn-primary" : "btn-ghost"}
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                📅 {panelView === "schedule" ? "Hide Schedule" : "Schedule Intro Call"}
              </button>
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="chat-messages">
          {connectionState === "error" ? (
            <div style={{ textAlign: 'center', color: 'var(--warn)', margin: 'auto' }}>{joinError}</div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', margin: 'auto' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--paper)' }}>You're connected</p>
              <p style={{ fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>
                Say hello to {partnerName || "your match"} - this is a real, private conversation between the two of you.
              </p>
            </div>
          ) : (
            <>
              {hasMoreHistory && (
                <button onClick={handleLoadMore} disabled={loadingMore} className="btn-ghost" style={{ alignSelf: 'center', padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                  {loadingMore ? "Loading..." : "Load earlier messages"}
                </button>
              )}
              {messages.map((msg) => {
                const isMe = msg.sender_id === profile.id;
                return (
                  <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                    <div className={`msg-bubble ${isMe ? 'me' : 'them'}`}>
                      {msg.content}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.25rem', textAlign: isMe ? 'right' : 'left' }}>
                      {new Date(msg.inserted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={connectionState === "joined" ? "Type a message..." : "Connecting..."}
            disabled={connectionState !== "joined"}
            className="chat-input"
          />
          <button type="submit" className="btn-primary" style={{ padding: '0 1.5rem', height: '100%' }} disabled={!newMessage.trim() || connectionState !== "joined"}>
            Send
          </button>
        </form>
      </div>

      {/* Side panel - docked alongside the conversation, not replacing it.
          One slot, not two: schedule and profile share it. */}
      <div className={`chat-side-panel ${panelView ? "open" : ""}`}>
        <div className="chat-side-panel-inner">
          {panelView === "schedule" && matchId && (
            <SchedulingFlow matchId={matchId} profile={profile} partnerName={partnerName} onClose={() => setPanelView(null)} />
          )}
          {panelView === "profile" && matchId && (
            <MatchProfilePanel matchId={matchId} profile={profile} partnerName={partnerName} onClose={() => setPanelView(null)} />
          )}
        </div>
      </div>
    </div>
  );
}
