import { useState, useEffect, useRef } from "react";
import { Socket } from "phoenix";
import { apiFetch, getToken } from "../../lib/api";
import { enablePushNotifications } from "./pushSetup";

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
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen((v) => !v)} className="btn-ghost btn-sm" style={{ position: "relative" }}>
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-4px",
              right: "-4px",
              background: "var(--warn)",
              color: "var(--ink)",
              borderRadius: "999px",
              fontSize: "0.65rem",
              padding: "0.05rem 0.35rem",
              fontWeight: 700,
              lineHeight: 1.4,
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="panel"
          style={{ position: "absolute", bottom: 0, left: "calc(100% + 0.75rem)", width: "320px", maxHeight: "400px", overflowY: "auto", zIndex: 30, padding: "0.75rem" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <p className="panel-label" style={{ margin: 0 }}>Notifications</p>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="btn-ghost" style={{ padding: "0.2rem 0.6rem", fontSize: "0.75rem" }}>
                Mark all read
              </button>
            )}
          </div>

          {pushSupported && pushPermission === "default" && pushStatus !== "enabled" && (
            <button
              onClick={handleEnablePush}
              disabled={pushStatus === "enabling"}
              className="btn-ghost"
              style={{ width: "100%", padding: "0.5rem", fontSize: "0.8rem", marginBottom: "0.5rem", textAlign: "center" }}
            >
              {pushStatus === "enabling"
                ? "Requesting permission..."
                : pushStatus === "error"
                ? "Couldn't enable - try again?"
                : "🔔 Enable push alerts (works even with this tab closed)"}
            </button>
          )}

          {notifications.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: "0.85rem", textAlign: "center", margin: "1rem 0" }}>Nothing yet.</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "0.6rem 0.5rem",
                  background: n.is_read ? "transparent" : "var(--brass-wash)",
                  border: "none",
                  borderBottom: "1px solid var(--ink-line)",
                  cursor: "pointer",
                  color: "var(--paper)",
                }}
              >
                <div style={{ fontSize: "0.85rem" }}>{n.body}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.2rem" }}>{timeAgo(n.inserted_at)}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
