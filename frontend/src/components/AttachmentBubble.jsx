import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";
import "./AttachmentBubble.css";

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Fetched as an authenticated blob rather than a plain <img src="/api/..."> -
// the download endpoint is gated by "must be a participant in this room"
// (VokaziWeb.AuthPlug only reads the Authorization header, not a query
// param), so a bare URL a browser could load with no auth header at all
// would just 401.
export default function AttachmentBubble({ attachment }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl;
    let cancelled = false;

    apiFetch(`/api/attachments/${attachment.id}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => !cancelled && setError(true));

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.id]);

  const isImage = attachment.content_type?.startsWith("image/");
  const isAudio = attachment.content_type?.startsWith("audio/");

  if (error) {
    return <div className="attachment-chip attachment-chip-error">Couldn't load {attachment.filename}</div>;
  }

  if (isImage) {
    return blobUrl ? (
      <a href={blobUrl} target="_blank" rel="noreferrer" className="attachment-image-link">
        <img src={blobUrl} alt={attachment.filename} className="attachment-image" />
      </a>
    ) : (
      <div className="attachment-chip attachment-chip-loading">Loading image...</div>
    );
  }

  if (isAudio) {
    return blobUrl ? (
      <audio controls src={blobUrl} className="attachment-audio" />
    ) : (
      <div className="attachment-chip attachment-chip-loading">Loading voice note...</div>
    );
  }

  return (
    <a
      href={blobUrl || undefined}
      download={attachment.filename}
      className={`attachment-chip ${blobUrl ? "" : "attachment-chip-loading"}`}
      onClick={(e) => !blobUrl && e.preventDefault()}
    >
      <span className="attachment-chip-icon">📄</span>
      <span className="attachment-chip-info">
        <span className="attachment-chip-name">{attachment.filename}</span>
        <span className="attachment-chip-size">{blobUrl ? formatBytes(attachment.byte_size) : "Loading..."}</span>
      </span>
    </a>
  );
}
