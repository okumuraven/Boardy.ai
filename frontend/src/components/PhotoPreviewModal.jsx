import { useState, useEffect } from "react";
import "./PhotoPreviewModal.css";

// Below this, a photo looks visibly blurry once actually displayed at
// avatar/tile size - not an arbitrary number, just "don't let someone
// upload a 40x40 thumbnail and be surprised it's mush."
const MIN_DIMENSION = 200;

// Shown right after a file is picked, before it's ever uploaded -
// renders it inside the exact circle/square shape it'll actually live
// in, so a bad crop (a logo's fine print, an off-center face, a
// landscape photo) is obvious immediately and the person can just pick
// a different file instead of filing a bug report about how their own
// upload rendered. `shape` matches the real consumer: "circle" for the
// identity avatar, "square" for a "Show your work" tile.
export default function PhotoPreviewModal({
  file,
  shape,
  onConfirm,
  onCancel,
  confirming,
  hint = "A clear, well-lit photo of your face works best.",
}) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [tooSmall, setTooSmall] = useState(false);

  useEffect(() => {
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setTooSmall(false);

    const img = new Image();
    img.onload = () => setTooSmall(img.naturalWidth < MIN_DIMENSION || img.naturalHeight < MIN_DIMENSION);
    img.src = url;

    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!file) return null;

  return (
    <div className="photo-preview-backdrop" onClick={onCancel}>
      <div className="photo-preview-modal" onClick={(e) => e.stopPropagation()}>
        <p className="photo-preview-title">Preview your photo</p>

        <div className={`photo-preview-frame photo-preview-frame-${shape}`}>
          {previewUrl && <img src={previewUrl} alt="Preview" className="photo-preview-image" />}
        </div>

        {tooSmall ? (
          <p className="photo-preview-warning">
            This image is too small and would look blurry once cropped - please choose a higher-resolution photo.
          </p>
        ) : (
          <p className="photo-preview-hint">{hint}</p>
        )}

        <div className="photo-preview-actions">
          <button className="btn-ghost" onClick={onCancel} disabled={confirming}>
            Choose another
          </button>
          <button className="btn-primary" onClick={() => onConfirm(file)} disabled={confirming || tooSmall}>
            {confirming ? "Uploading..." : "Use this photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
