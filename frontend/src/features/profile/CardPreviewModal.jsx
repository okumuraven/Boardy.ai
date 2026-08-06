import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";
import MemberCard from "../directory/MemberCard";
import "./CardPreviewModal.css";

// "Preview as public" (profile.md §5) - shows a member exactly the card
// other people see in the Directory, using the real MemberCard
// component (not a mockup) so it can never drift out of sync with what
// actually renders there. Fetches fresh on every open rather than
// reusing whatever the caller already has in memory, since the whole
// point is showing the *current*, saved state - not an in-progress edit
// that hasn't been submitted yet.
export default function CardPreviewModal({ onClose }) {
  const [member, setMember] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/profiles/me/preview_card")
      .then((res) => res.json())
      .then(setMember)
      .catch(() => setError("Couldn't load your card. Please try again."));
  }, []);

  return (
    <div className="card-preview-backdrop" onClick={onClose}>
      <div className="card-preview-modal" onClick={(e) => e.stopPropagation()}>
        <p className="card-preview-title">This is your card</p>
        <p className="card-preview-hint">Exactly what other members see when they browse the Directory.</p>

        {error && <p className="card-preview-error">{error}</p>}
        {!error && !member && <p className="card-preview-hint">Loading...</p>}
        {member && (
          <div className="card-preview-frame">
            <MemberCard member={member} previewMode />
          </div>
        )}

        <button className="btn-ghost" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
