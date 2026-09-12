import { GUIDE_STEPS } from "./guideContent";
import { HomeIcon, DirectoryIcon, MatchesIcon, CallHistoryIcon, CalendarIcon, BiziIcon, DiscussionIcon, ProfileIcon } from "../shell/icons";
import "./GuideModal.css";

// Same navKey -> Icon pairing as AppShell.jsx's TABS array (icons.jsx is
// the actual shared source; TABS itself isn't exported, so this just
// re-pairs the same icons rather than importing AppShell's local const) -
// keeps every row's icon visually identical to the real nav button it
// describes, not a redrawn stand-in.
const ICONS = {
  home: HomeIcon,
  directory: DirectoryIcon,
  matches: MatchesIcon,
  calls: CallHistoryIcon,
  calendar: CalendarIcon,
  bizi: BiziIcon,
  discussion: DiscussionIcon,
  profile: ProfileIcon,
};

export default function GuideModal({ onClose, onStartTour }) {
  return (
    <div className="guide-modal-backdrop" onClick={onClose}>
      <div className="guide-modal" onClick={(e) => e.stopPropagation()}>
        <div className="guide-modal-header">
          <div>
            <h2 className="guide-modal-title">How Kuzana Connect works</h2>
            <p className="guide-modal-subtitle">What each part of the app is for, and how to use it.</p>
          </div>
          <button onClick={onClose} className="btn-ghost btn-sm">Close</button>
        </div>

        <button onClick={() => onStartTour()} className="btn-primary btn-sm guide-modal-tour-btn">
          Take the full tour →
        </button>

        <div className="guide-modal-list">
          {GUIDE_STEPS.map((step) => {
            const Icon = ICONS[step.navKey];
            return (
              <div key={step.navKey} className="guide-modal-row">
                <span className="guide-modal-row-icon"><Icon /></span>
                <div className="guide-modal-row-text">
                  <p className="guide-modal-row-title">{step.title}</p>
                  <p className="guide-modal-row-desc">{step.description}</p>
                </div>
                <button onClick={() => onStartTour(step.navKey)} className="btn-ghost btn-sm guide-modal-row-btn">
                  Show me →
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
