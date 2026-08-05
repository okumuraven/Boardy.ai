import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";

const initials = (name) =>
  (name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

// Every consumer (ProfileView, MemberCard, the shell rail, ChatSystem,
// MatchesList, CallHistoryView) already has its own circle/size/
// background CSS class (.profile-view-avatar, .rail-avatar, etc.) -
// this component keeps rendering that exact outer element so none of
// that per-feature styling needs to change, it just fills it with a
// real photo when one exists instead of always showing initials.
//
// Fetched as an authenticated blob rather than a plain <img src="/api/...">
// - every avatar/photo endpoint requires the same Authorization header
// as the rest of this app (VokaziWeb.AuthPlug only reads that header,
// never a query param), so a bare URL a browser could load with no
// auth header at all would just 401. See AttachmentBubble.jsx for the
// identical pattern applied to chat attachments.
//
// Pass `avatarUrl` when the caller already has it from an API response
// (skips the fetch entirely when it's null/undefined - e.g. Directory
// rows that already know there's nothing to show). Pass `userId` alone
// to always attempt the default `/api/profiles/:userId/avatar` path and
// fall back to initials on a 404.
export default function Avatar({ userId, avatarUrl, name, className, children }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const resolvedUrl = avatarUrl !== undefined ? avatarUrl : userId ? `/api/profiles/${userId}/avatar` : null;

  useEffect(() => {
    if (!resolvedUrl) {
      setBlobUrl(null);
      return;
    }

    let objectUrl;
    let cancelled = false;

    apiFetch(resolvedUrl)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => !cancelled && setBlobUrl(null));

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [resolvedUrl]);

  return (
    <div className={className}>
      {blobUrl ? <img src={blobUrl} alt={name || "Avatar"} className="avatar-photo" /> : initials(name)}
      {children}
    </div>
  );
}
