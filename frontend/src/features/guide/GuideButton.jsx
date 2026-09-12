import { useEffect, useState } from "react";
import { startTour, hasSeenTour } from "./tour";
import GuideModal from "./GuideModal";
import "./GuideButton.css";

// Global "?" entry point (mounted once in AppShell, mirrors
// FeedbackWidget's fixed-trigger-button convention from the opposite
// corner) plus the one-time auto-launch on a member's first-ever visit -
// self-contained the same way FeedbackWidget owns its own visibility
// fetch, so AppShell only needs to mount this and wire the More-sheet
// callbacks through.
export default function GuideButton({ onOpenMoreSheet, onCloseMoreSheet }) {
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (hasSeenTour()) return;
    // Short delay so the shell has visually settled (avatar/nav loaded)
    // before spotlighting anything, rather than starting the instant
    // this component mounts mid-render.
    const timeout = setTimeout(() => {
      startTour({ onOpenMoreSheet, onCloseMoreSheet });
    }, 600);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartTour = (fromKey) => {
    setModalOpen(false);
    startTour({ fromKey, onOpenMoreSheet, onCloseMoreSheet });
  };

  return (
    <>
      <button onClick={() => setModalOpen(true)} className="guide-fab" title="How Kuzana Connect works" aria-label="Guide">
        ?
      </button>

      {modalOpen && <GuideModal onClose={() => setModalOpen(false)} onStartTour={handleStartTour} />}
    </>
  );
}
