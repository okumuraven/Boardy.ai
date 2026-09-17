import { useState, useEffect, useRef } from "react";
import { Socket } from "phoenix";
import { apiFetch, getToken } from "../../lib/api";
import { enablePushNotifications } from "./pushSetup";
import { TYPE_GLYPH } from "./notificationGlyphs";
import "./NotificationBell.css";

// Real SVG, not emoji (🔔 renders inconsistently across OS/browsers and
// was the last spot in the notification UI still using a glyph instead
// of the app's real icon set).
function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

const timeAgo = (iso) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

// The in-app half of the Notification Hub (notification_system.md
// Phase 1) - a personal `user:{id}` channel delivers events live while
// this is mounted; the REST fetch on mount covers whatever arrived
// while it wasn't. Web Push (Phase 2) is what reaches someone with the
// tab fully closed - this only ever helps while the app is open.
export default function NotificationBell({ profile, onOpen }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [pushStatus, setPushStatus] = useState("idle"); // idle | enabling | enabled | error
  const socketRef = useRef(null);

  const apiUrl = import.meta.env.VITE_API_URL;
  const pushSupported = typeof Notification !== "undefined" && "serviceWorker" in navigator;
  const pushPermission = pushSupported ? Notification.permission : "unsupported";

  useEffect(() => {
    if (!profile?.id) return;

    apiFetch(`/api/notifications`)
      .then((res) => res.json())
      .then((data) => {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      })
      .catch(() => {});

    const socketUrl = `${apiUrl.replace(/^http/, "ws")}/socket`;
    const socket = new Socket(socketUrl, { params: { token: getToken() } });
    socket.connect();
    socketRef.current = socket;

    const channel = socket.channel(`user:${profile.id}`, {});
    channel.on("history", ({ notifications: history, unread_count }) => {
      setNotifications(history);
      setUnreadCount(unread_count);
    });
    channel.on("new_notification", (notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 20));
      setUnreadCount((prev) => prev + 1);
    });
    channel.join();

    return () => {
      channel.leave();
      socket.disconnect();
    };
  }, [profile?.id, apiUrl]);

  const markAllRead = () => {
    apiFetch(`/api/notifications/mark_all_read`, { method: "POST" }).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleEnablePush = () => {
    setPushStatus("enabling");
    enablePushNotifications()
      .then(() => setPushStatus("enabled"))
      .catch(() => setPushStatus("error"));
  };

  const handleClick = (notification) => {
    if (!notification.is_read) {
      apiFetch(`/api/notifications/${notification.id}/read`, { method: "POST" }).catch(() => {});
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    setOpen(false);
    onOpen?.(notification);
  };

  return (
    <div className="notif-bell-wrap">
      <button onClick={() => setOpen((v) => !v)} className="btn-ghost btn-sm notif-bell-btn" aria-label="Notifications">
        <BellIcon />
        {unreadCount > 0 && <span className="notif-bell-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      {open && (
        <div className="panel notif-dropdown">
          <div className="notif-dropdown-header">
            <p className="panel-label">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="btn-ghost btn-sm notif-mark-read-btn">
                Mark all read
              </button>
            )}
          </div>

          {pushSupported && pushPermission === "default" && pushStatus !== "enabled" && (
            <button onClick={handleEnablePush} disabled={pushStatus === "enabling"} className="notif-push-cta">
              <span className="notif-push-cta-icon"><BellIcon /></span>
              {pushStatus === "enabling" ? (
                <span className="notif-push-cta-text">Requesting permission…</span>
              ) : pushStatus === "error" ? (
                <span className="notif-push-cta-text">Couldn't enable - try again?</span>
              ) : (
                <span className="notif-push-cta-text">
                  <span className="notif-push-cta-title">Enable push alerts</span>
                  <span className="notif-push-cta-sub">Works even with this tab closed</span>
                </span>
              )}
            </button>
          )}

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <BellIcon />
                <p className="notif-empty-title">Nothing yet</p>
                <p className="notif-empty-sub">New activity on your intros shows up here.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const glyph = TYPE_GLYPH[n.type] || TYPE_GLYPH.chat_message;
                const Icon = glyph.Icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`notif-row ${n.is_read ? "" : "unread"}`}
                    style={{ borderLeftColor: glyph.accent }}
                  >
                    <span className="notif-row-glyph" style={{ background: glyph.bg, color: glyph.color }}>
                      <Icon />
                    </span>
                    <span className="notif-row-text">
                      <span className="notif-row-body">{n.body}</span>
                      <span className="notif-row-time">{timeAgo(n.inserted_at)}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
