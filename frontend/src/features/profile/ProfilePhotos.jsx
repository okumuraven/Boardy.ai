import { useState, useRef } from "react";
import { apiFetch } from "../../lib/api";
import Avatar from "../../components/Avatar";
import PhotoPreviewModal from "../../components/PhotoPreviewModal";
import "./ProfilePhotos.css";

const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
const TILE_COUNT = 3;

// Optional "show your work" gallery - a member's product, workspace, or
// team, separate from the identity avatar above it. Off by default
// (business_photos_public) so adding a photo never surprises anyone by
// immediately showing up on their Directory card.
export default function ProfilePhotos({ profile, onProfileUpdated }) {
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const [removingIndex, setRemovingIndex] = useState(null);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [error, setError] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const fileInputRef = useRef(null);
  const targetIndexRef = useRef(null);

  const photos = profile?.business_photos || [];
  const isPublic = !!profile?.business_photos_public;

  const openPicker = (index) => {
    targetIndexRef.current = index;
    fileInputRef.current?.click();
  };

  const handleFileChosen = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) setPendingFile(file);
  };

  const uploadPhoto = (file) => {
    const index = targetIndexRef.current;
    setError("");
    setUploadingIndex(index);
    const body = new FormData();
    body.append("file", file);

    apiFetch("/api/profiles/business_photos", { method: "POST", body })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) setError(data.error || "Couldn't upload photo.");
        else onProfileUpdated?.();
      })
      .catch(() => setError("Couldn't reach the server. Please try again."))
      .finally(() => {
        setUploadingIndex(null);
        setPendingFile(null);
      });
  };

  const removePhoto = (index) => {
    setError("");
    setRemovingIndex(index);
    apiFetch(`/api/profiles/business_photos/${index}`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) throw new Error();
        onProfileUpdated?.();
      })
      .catch(() => setError("Couldn't remove photo. Please try again."))
      .finally(() => setRemovingIndex(null));
  };

  const toggleVisibility = () => {
    setError("");
    setTogglingVisibility(true);
    apiFetch("/api/profiles/business_photos/visibility", {
      method: "POST",
      body: JSON.stringify({ public: !isPublic }),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        onProfileUpdated?.();
      })
      .catch(() => setError("Couldn't update visibility. Please try again."))
      .finally(() => setTogglingVisibility(false));
  };

  return (
    <div className="panel profile-photos">
      <p className="panel-label">Show your work</p>
      <p className="profile-photos-hint">
        Up to 3 photos of your product, workspace, or team - optional, and just for you until you
        switch on visibility below.
      </p>

      <div className="profile-photos-grid">
        {Array.from({ length: TILE_COUNT }, (_, index) => {
          const photoUrl = photos[index];

          if (photoUrl) {
            return (
              <div key={index} className="profile-photo-tile profile-photo-tile-filled">
                <Avatar avatarUrl={photoUrl} className="profile-photo-image" />
                <button
                  className="profile-photo-remove"
                  onClick={() => removePhoto(index)}
                  disabled={removingIndex === index}
                  title="Remove photo"
                  aria-label="Remove photo"
                >
                  {removingIndex === index ? "···" : "✕"}
                </button>
              </div>
            );
          }

          return (
            <button
              key={index}
              className="profile-photo-tile profile-photo-tile-empty"
              disabled={uploadingIndex === index}
              onClick={() => openPicker(index)}
            >
              {uploadingIndex === index ? "···" : "+"}
            </button>
          );
        })}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={PHOTO_ACCEPT}
        style={{ display: "none" }}
        onChange={handleFileChosen}
      />

      <PhotoPreviewModal
        file={pendingFile}
        shape="square"
        confirming={uploadingIndex !== null}
        onConfirm={uploadPhoto}
        onCancel={() => setPendingFile(null)}
        hint="A clear photo of your product, workspace, or team works best."
      />

      {photos.length > 0 && (
        <label className="profile-photos-visibility">
          <input type="checkbox" checked={isPublic} disabled={togglingVisibility} onChange={toggleVisibility} />
          <span>{isPublic ? "Visible on your Directory card" : "Only visible to you"}</span>
        </label>
      )}

      {error && <p className="profile-photos-error">{error}</p>}
    </div>
  );
}
