import { useState, useEffect, useRef, useCallback } from "react";
import { Socket, Presence } from "phoenix";
import { getToken } from "../lib/api";
import SchedulingFlow from "../features/scheduling";
import MatchProfilePanel from "../features/matches/MatchProfilePanel";
import CallPanel from "./CallPanel";

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
  // Mirrors channelRef.current for CallPanel's prop - reading a ref's
  // .current during render isn't allowed, so this is set alongside the
  // ref right when the channel is actually created.
  const [channelForCall, setChannelForCall] = useState(null);

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
    const socket = new Socket(socketUrl, { params: { token: getToken() } });
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
      .receive("ok", () => {
        setConnectionState("joined");
        setChannelForCall(channel);
      })
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
      setChannelForCall(null);
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
        <div className="chat-header">
          <div className="chat-header-identity">
            <button onClick={onBack} className="nav-link chat-header-back">
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
            <div className="chat-header-actions">
              <CallPanel channel={channelForCall} profile={profile} partnerName={partnerName} />
              <button
                onClick={() => setPanelView((v) => (v === "profile" ? null : "profile"))}
                className={`chat-action-btn ${panelView === "profile" ? "btn-primary" : "btn-ghost"}`}
                title={panelView === "profile" ? "Hide profile" : `View ${partnerName || "profile"}`}
              >
                <span className="btn-icon">👤</span>
                <span className="btn-label">{panelView === "profile" ? "Hide Profile" : `View ${partnerName || "Profile"}`}</span>
              </button>
              <button
                onClick={() => setPanelView((v) => (v === "schedule" ? null : "schedule"))}
                className={`chat-action-btn ${panelView === "schedule" ? "btn-primary" : "btn-ghost"}`}
                title={panelView === "schedule" ? "Hide schedule" : "Schedule intro call"}
              >
                <span className="btn-icon">📅</span>
                <span className="btn-label">{panelView === "schedule" ? "Hide Schedule" : "Schedule Intro Call"}</span>
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
                const time = new Date(msg.inserted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                // Ring/end/miss events are app-level, not chat content -
                // rendered as a compact centered pill, not a full bubble.
                if (msg.content?.startsWith("📞")) {
                  return (
                    <div key={msg.id} className="msg-system">
                      {msg.content} · {time}
                    </div>
                  );
                }
                const isMe = msg.sender_id === profile.id;
                return (
                  <div key={msg.id} className={`msg-bubble ${isMe ? 'me' : 'them'}`}>
                    <span className="msg-text">{msg.content}</span>
                    <span className="msg-time">{time}</span>
                  </div>
                );
              })}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSendMessage} className="chat-input-row">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={connectionState === "joined" ? "Type a message..." : "Connecting..."}
            disabled={connectionState !== "joined"}
            className="chat-input"
          />
          <button
            type="submit"
            className="chat-send-btn"
            disabled={!newMessage.trim() || connectionState !== "joined"}
            title="Send"
            aria-label="Send"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 20L21 12L3 4L3 10.5L16 12L3 13.5L3 20Z" fill="currentColor" />
            </svg>
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
