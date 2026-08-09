import { useState, useEffect, useRef, useCallback } from "react";
import { Socket, Presence } from "phoenix";
import { getToken, apiFetch } from "../lib/api";
import "./ChatSystem.css";
import "./ChatHeader.css";
import "./ChatComposer.css";
import SchedulingFlow from "../features/scheduling";
import MatchProfilePanel from "../features/matches/MatchProfilePanel";
import FlagConcernPanel from "../features/matches/FlagConcernPanel";
import CallPanel from "./CallPanel";
import AttachmentBubble from "./AttachmentBubble";
import Avatar from "./Avatar";

const HISTORY_PAGE_SIZE = 50;

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDuration = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export default function ChatRoomView({ roomId, matchId, pairingKind, profile, partnerName, partnerAvatarUrl, introMessage, myOpener, startInScheduling, onBack, attachmentActions, prefillMessage }) {
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
  // The file finishes its HTTP upload (and gets a real attachment id)
  // *before* the user hits send - "sending" only ever pushes a small
  // JSON reference over the channel, never raw bytes.
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [uploadState, setUploadState] = useState("idle"); // idle | uploading | error
  const [uploadError, setUploadError] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  // WhatsApp-style "swipe to reply" (or, on desktop where there's no
  // touch gesture, a hover-revealed button - see .msg-reply-btn) - the
  // message currently quoted for the next send, cleared once it's sent
  // or explicitly cancelled.
  const [replyingTo, setReplyingTo] = useState(null);
  // Which message id to briefly flash (tapping a quoted snippet jumps
  // to and highlights the original it quoted).
  const [highlightedId, setHighlightedId] = useState(null);
  // Only one bubble is ever mid-swipe at a time - {id, dx} rather than
  // per-bubble state, since re-rendering every bubble on every
  // touchmove of just one of them would be wasteful.
  const [swipeState, setSwipeState] = useState({ id: null, dx: 0 });
  const swipeStartRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const chatMessagesRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingTimerRef = useRef(null);
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

  // Lets a caller (the Bizi AI Assessment panel's "Load draft into
  // chat") drop text straight into the real compose box - "editable
  // text and a send button" per bizi_verification_build_plan.md
  // Phase E means literally reusing the existing send path below, not
  // building a second one, so attribution to whichever admin actually
  // clicks send stays automatic rather than something to get wrong.
  useEffect(() => {
    if (prefillMessage) setNewMessage(prefillMessage);
  }, [prefillMessage]);

  // A single-line <input> just scrolls long text off-screen horizontally,
  // so there's no way to see or edit anything past the first few words
  // before sending - real chat apps (WhatsApp/Telegram) grow the compose
  // box to fit what's typed instead. Reset to "auto" before reading
  // scrollHeight each time, or a box that's already tall would never be
  // able to measure itself shrinking back down when text is deleted.
  const MAX_COMPOSE_HEIGHT = 120;
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_COMPOSE_HEIGHT)}px`;
  }, [newMessage]);

  const SWIPE_REPLY_THRESHOLD = 56;
  const SWIPE_REPLY_MAX = 72;

  const startReply = (msg) => {
    setReplyingTo({
      id: msg.id,
      content: msg.content,
      sender_id: msg.sender_id,
      sender_name: msg.sender_id === profile.id ? "You" : (msg.sender_name || partnerName || "them"),
    });
    textareaRef.current?.focus();
  };

  // Swipe-right on a bubble to reply, matching WhatsApp exactly - no
  // e.preventDefault() here, so the message list's own vertical scroll
  // (a normal up/down drag) is never fought with; only a clearly
  // rightward drag accumulates into a reply.
  const handleBubbleTouchStart = (msg) => (e) => {
    swipeStartRef.current = { id: msg.id, x: e.touches[0].clientX };
  };

  const handleBubbleTouchMove = (msg) => (e) => {
    if (swipeStartRef.current?.id !== msg.id) return;
    const dx = e.touches[0].clientX - swipeStartRef.current.x;
    if (dx > 0) setSwipeState({ id: msg.id, dx: Math.min(dx, SWIPE_REPLY_MAX) });
  };

  const handleBubbleTouchEnd = (msg) => () => {
    if (swipeStartRef.current?.id === msg.id && swipeState.dx >= SWIPE_REPLY_THRESHOLD) {
      startReply(msg);
    }
    swipeStartRef.current = null;
    setSwipeState({ id: null, dx: 0 });
  };

  // Tapping a quoted snippet inside a bubble jumps to and briefly
  // flashes the original message it quoted (.msg-bubble.highlighted),
  // the same "show me what this was replying to" affordance WhatsApp
  // gives. Scoped to this room's own message list, not a bare
  // document.querySelector, in case more than one chat is ever mounted
  // at once.
  const scrollToMessage = (id) => {
    const el = chatMessagesRef.current?.querySelector(`[data-message-id="${id}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedId(id);
    setTimeout(() => setHighlightedId((current) => (current === id ? null : current)), 1500);
  };

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
    if ((!content && !pendingAttachment) || connectionState !== "joined" || uploadState === "uploading") return;

    // Only the attachment (real upload effort already spent) survives a
    // failed/timed-out send so it can be retried without re-uploading -
    // text clearing optimistically is pre-existing behavior, unchanged.
    // The reply reference, on the other hand, is cheap to redo, so it's
    // cleared optimistically along with the text.
    channelRef.current
      ?.push("new_msg", { content, attachment_id: pendingAttachment?.id, reply_to_id: replyingTo?.id })
      .receive("ok", () => setPendingAttachment(null))
      .receive("error", ({ reason }) => alert(reason || "Message failed to send."))
      .receive("timeout", () => alert("Message timed out - please try again."));

    setNewMessage("");
    setReplyingTo(null);
  };

  // Covers both a brand new empty chat and one that's already gone
  // quiet after a message or two - unlike the empty-state intro card
  // (which only ever shows once, before any real message exists), this
  // is available any time. Caches server-side after the first call
  // (Vokazi.Matchmaking.get_or_generate_opener/2), so re-clicking later
  // in the same match doesn't re-spend an AI call.
  const suggestOpener = async () => {
    if (!matchId) return;
    setSuggesting(true);
    setSuggestError("");
    try {
      const res = await apiFetch(`/api/matches/${matchId}/generate_opener`, { method: "POST" });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      if (data.opener) setNewMessage(data.opener);
    } catch {
      setSuggestError("Couldn't come up with a suggestion right now.");
    } finally {
      setSuggesting(false);
    }
  };

  const uploadFile = async (file) => {
    setUploadState("uploading");
    setUploadError("");
    setPendingAttachment(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await apiFetch(`/api/chat_rooms/${roomId}/attachments`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Upload failed.");
      setPendingAttachment(data);
      setUploadState("idle");
    } catch (err) {
      setUploadState("error");
      setUploadError(err.message || "Couldn't upload that file.");
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) uploadFile(file);
  };

  const discardRecordingRef = useRef(false);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        clearInterval(recordingTimerRef.current);
        setIsRecording(false);
        setRecordingSeconds(0);

        if (!discardRecordingRef.current && chunks.length) {
          const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
          uploadFile(new File([blob], "voice-note.webm", { type: blob.type }));
        }
      };

      discardRecordingRef.current = false;
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {
      setUploadState("error");
      setUploadError("Microphone access was denied or unavailable.");
    }
  };

  // `discard: true` (the pending-strip's × while recording) throws the
  // clip away instead of uploading it - same MediaRecorder stop event
  // either way, the flag just tells onstop whether to keep going.
  const stopRecording = (discard = false) => {
    discardRecordingRef.current = discard;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  };

  useEffect(() => {
    return () => {
      clearInterval(recordingTimerRef.current);
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        discardRecordingRef.current = true;
        recorder.stop();
      }
    };
  }, []);

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
            {onBack && (
              <button onClick={onBack} className="nav-link chat-header-back">
                ←
              </button>
            )}
            <Avatar avatarUrl={partnerAvatarUrl} name={partnerName} className="chat-header-avatar" />
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
              {pairingKind === "buddy" && (
                <button
                  onClick={() => setPanelView((v) => (v === "concern" ? null : "concern"))}
                  className={`chat-action-btn ${panelView === "concern" ? "btn-primary" : "btn-ghost"}`}
                  title={panelView === "concern" ? "Close" : "Flag a concern to the Kuzana team"}
                >
                  <span className="btn-icon">⚠️</span>
                  <span className="btn-label">{panelView === "concern" ? "Close" : "Flag a Concern"}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="chat-messages" ref={chatMessagesRef}>
          {connectionState === "error" ? (
            <div style={{ textAlign: 'center', color: 'var(--warn)', margin: 'auto' }}>{joinError}</div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', margin: 'auto', maxWidth: '460px', padding: '0 1rem' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: '0.75rem', color: 'var(--paper)' }}>You're connected</p>
              {matchId && introMessage ? (
                <>
                  <div style={{ background: 'var(--brass-wash)', border: '1px solid var(--ink-line-strong)', borderRadius: '14px', padding: '1rem 1.1rem', textAlign: 'left' }}>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--brass)', margin: '0 0 0.5rem' }}>
                      ✨ Introduced by Kuzana AI
                    </p>
                    <p style={{ fontSize: '0.9rem', color: 'var(--paper)', margin: 0, lineHeight: 1.5 }}>{introMessage}</p>
                  </div>
                  {myOpener && (
                    <div style={{ marginTop: '0.85rem', textAlign: 'left' }}>
                      <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '0 0 0.4rem' }}>Not sure how to start? Here's a draft:</p>
                      <p style={{ fontSize: '0.88rem', color: 'var(--paper)', fontStyle: 'italic', margin: '0 0 0.6rem', lineHeight: 1.5 }}>"{myOpener}"</p>
                      <button type="button" className="btn-ghost btn-sm" onClick={() => setNewMessage(myOpener)}>
                        Use this opener
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p style={{ fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>
                  {matchId
                    ? `Say hello to ${partnerName || "your match"} - this is a real, private conversation between the two of you.`
                    : `Say hello to ${partnerName || "the team"} - a real, private conversation, visible only to you and them.`}
                </p>
              )}
            </div>
          ) : (
            <>
              {hasMoreHistory && (
                <button onClick={handleLoadMore} disabled={loadingMore} className="btn-ghost" style={{ alignSelf: 'center', padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                  {loadingMore ? "Loading..." : "Load earlier messages"}
                </button>
              )}
              {messages.map((msg, i) => {
                const time = new Date(msg.inserted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                // Ring/end/miss events are app-level, not chat content -
                // rendered as a compact centered pill, not a full bubble.
                if (msg.content?.startsWith("📞")) {
                  return (
                    <div key={msg.id} className="msg-system">
                      <span className="msg-system-icon">📞</span>
                      <span className="msg-system-text">{msg.content.replace("📞", "").trim()}</span>
                      <span className="msg-system-time">{time}</span>
                    </div>
                  );
                }
                const isMe = msg.sender_id === profile.id;
                // No single fixed "other side" on a Bizi room (matchId
                // null) - any active admin can reply, so the applicant
                // needs to know WHICH one, not just "Kuzana team".
                // Collapsed like a real group thread: the label only
                // repeats when the sender actually changes.
                const showSenderLabel = !isMe && !matchId && msg.sender_name && messages[i - 1]?.sender_id !== msg.sender_id;
                const swipeDx = swipeState.id === msg.id ? swipeState.dx : 0;
                return (
                  <div
                    key={msg.id}
                    data-message-id={msg.id}
                    className={`msg-bubble ${isMe ? 'me' : 'them'} ${highlightedId === msg.id ? 'highlighted' : ''}`}
                    style={swipeDx ? { transform: `translateX(${swipeDx}px)` } : undefined}
                    onTouchStart={handleBubbleTouchStart(msg)}
                    onTouchMove={handleBubbleTouchMove(msg)}
                    onTouchEnd={handleBubbleTouchEnd(msg)}
                  >
                    {swipeDx > 8 && (
                      <span className="msg-reply-indicator" style={{ opacity: Math.min(swipeDx / SWIPE_REPLY_THRESHOLD, 1) }}>↩</span>
                    )}
                    <button type="button" className="msg-reply-btn" onClick={() => startReply(msg)} aria-label="Reply" title="Reply">
                      ↩
                    </button>
                    {showSenderLabel && (
                      <span className="msg-sender-label">
                        <Avatar userId={msg.sender_id} name={msg.sender_name} className="msg-sender-avatar" />
                        {msg.sender_name} <span className="msg-sender-org">· Kuzana team</span>
                      </span>
                    )}
                    {msg.reply_to && (
                      <button type="button" className="msg-reply-quote" onClick={() => scrollToMessage(msg.reply_to.id)}>
                        <span className="msg-reply-quote-sender">
                          {msg.reply_to.sender_id === profile.id ? "You" : (msg.reply_to.sender_name || partnerName)}
                        </span>
                        <span className="msg-reply-quote-text">{msg.reply_to.content || "📎 Attachment"}</span>
                      </button>
                    )}
                    {msg.attachment && <AttachmentBubble attachment={msg.attachment} />}
                    {msg.attachment && attachmentActions?.(msg)}
                    {msg.content && <span className="msg-text">{msg.content}</span>}
                    <span className="msg-time">{time}</span>
                  </div>
                );
              })}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        {replyingTo && (
          <div className="chat-reply-preview">
            <div className="chat-reply-preview-body">
              <span className="chat-reply-preview-sender">{replyingTo.sender_name}</span>
              <span className="chat-reply-preview-text">{replyingTo.content || "📎 Attachment"}</span>
            </div>
            <button type="button" className="chat-reply-preview-cancel" onClick={() => setReplyingTo(null)} aria-label="Cancel reply">
              ×
            </button>
          </div>
        )}
        {suggestError && (
          <div className="chat-pending-attachment error">
            <span className="chat-pending-attachment-name">{suggestError}</span>
          </div>
        )}
        {(pendingAttachment || uploadState !== "idle" || isRecording) && (
          <div className={`chat-pending-attachment ${uploadState === "error" ? "error" : ""}`}>
            {isRecording ? (
              <span className="chat-pending-attachment-name">
                <span className="chat-recording-dot" /> Recording... {formatDuration(recordingSeconds)}
              </span>
            ) : uploadState === "uploading" ? (
              <span className="chat-pending-attachment-name">Uploading...</span>
            ) : uploadState === "error" ? (
              <span className="chat-pending-attachment-name">{uploadError}</span>
            ) : pendingAttachment ? (
              <span className="chat-pending-attachment-name">
                {pendingAttachment.content_type?.startsWith("audio/") ? "🎤 Voice note" : `📎 ${pendingAttachment.filename}`} · {formatBytes(pendingAttachment.byte_size)}
              </span>
            ) : null}
            {isRecording ? (
              <button type="button" className="chat-pending-attachment-remove" onClick={() => stopRecording(true)} aria-label="Cancel recording" title="Cancel recording">
                ×
              </button>
            ) : (pendingAttachment || uploadState === "error") ? (
              <button
                type="button"
                className="chat-pending-attachment-remove"
                onClick={() => { setPendingAttachment(null); setUploadState("idle"); setUploadError(""); }}
                aria-label="Remove attachment"
                title="Remove attachment"
              >
                ×
              </button>
            ) : null}
          </div>
        )}
        <form onSubmit={handleSendMessage} className="chat-input-row">
          <div className="chat-input-shell">
            <input ref={fileInputRef} type="file" onChange={handleFileSelect} style={{ display: "none" }} />
            <button
              type="button"
              className="chat-inline-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={connectionState !== "joined" || uploadState === "uploading"}
              title="Attach a file"
              aria-label="Attach a file"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            {matchId && (
              <button
                type="button"
                className="chat-inline-btn"
                onClick={suggestOpener}
                disabled={connectionState !== "joined" || suggesting}
                title="Suggest something to say"
                aria-label="Suggest something to say"
              >
                {suggesting ? "···" : "💡"}
              </button>
            )}
            <button
              type="button"
              className={`chat-inline-btn ${isRecording ? "recording" : ""}`}
              onClick={() => (isRecording ? stopRecording(false) : startRecording())}
              disabled={connectionState !== "joined" || uploadState === "uploading"}
              title={isRecording ? "Stop and send voice note" : "Record a voice note"}
              aria-label={isRecording ? "Stop and send voice note" : "Record a voice note"}
            >
              {isRecording ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2" /></svg>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </button>
            <textarea
              ref={textareaRef}
              rows={1}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={connectionState === "joined" ? "Type a message..." : "Connecting..."}
              disabled={connectionState !== "joined"}
              className="chat-input"
            />
          </div>
          <button
            type="submit"
            className="chat-send-btn"
            disabled={(!newMessage.trim() && !pendingAttachment) || connectionState !== "joined" || uploadState === "uploading"}
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
          {panelView === "concern" && matchId && (
            <FlagConcernPanel matchId={matchId} onClose={() => setPanelView(null)} />
          )}
        </div>
      </div>
    </div>
  );
}
