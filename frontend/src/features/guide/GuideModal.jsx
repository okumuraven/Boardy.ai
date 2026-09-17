import { GUIDE_STEPS } from "./guideContent";
import { HomeIcon, DirectoryIcon, MatchesIcon, CallHistoryIcon, CalendarIcon, BiziIcon, DiscussionIcon, ProfileIcon, HelpIcon } from "../shell/icons";
import "./GuideModal.css";

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

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
            <p className="panel-label guide-modal-kicker">Guide</p>
            <h2 className="guide-modal-title">How Kuzana Connect works</h2>
            <p className="guide-modal-subtitle">What each part of the app is for, and how to use it.</p>
          </div>
          <button onClick={onClose} className="btn-ghost btn-sm">Close</button>
        </div>

        <button onClick={() => onStartTour()} className="guide-modal-tour-cta">
          <span className="guide-modal-tour-cta-icon"><HelpIcon /></span>
          <span className="guide-modal-tour-cta-text">
            <span className="guide-modal-tour-cta-title">Take the full tour</span>
            <span className="guide-modal-tour-cta-sub">See every tab spotlighted, one at a time</span>
          </span>
          <span className="guide-modal-tour-cta-arrow"><ArrowRightIcon /></span>
        </button>

        <div className="guide-modal-list">
          {GUIDE_STEPS.map((step) => {
            const Icon = ICONS[step.navKey];
            return (
              <button key={step.navKey} onClick={() => onStartTour(step.navKey)} className="guide-modal-row">
                <span className="guide-modal-row-icon"><Icon /></span>
                <span className="guide-modal-row-text">
                  <span className="guide-modal-row-title">{step.title}</span>
                  <span className="guide-modal-row-desc">{step.description}</span>
                </span>
                <span className="guide-modal-row-arrow"><ArrowRightIcon /></span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
