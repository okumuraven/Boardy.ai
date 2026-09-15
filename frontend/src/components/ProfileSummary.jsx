import './ProfileSummary.css';

function OfferIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function NeedIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 1 3 6.7" />
      <path d="M3 17v-5h5" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M7 7l2.5 2.5M14.5 14.5L17 17M17 7l-2.5 2.5M9.5 14.5L7 17" />
    </svg>
  );
}

// The Offer/Need summary from the last interview, with a graceful
// fallback banner if the post-interview sync poll timed out before
// confirming fresh data. Lives inside HomeView's dashboard now, not as
// its own full-screen "welcome back" hero - no header of its own here,
// since HomeView already has one.
export default function ProfileSummary({
  profile,
  syncTimedOut,
  checkingAgain,
  onCheckAgain,
  onRedo,
  onFindMatch,
  findingMatch,
  findMatchMessage,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {syncTimedOut && (
        <div className="panel warn">
          <p className="panel-label warn">Still processing</p>
          <p style={{ color: 'var(--paper)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            This is taking longer than usual - your interview may still be syncing in the background.
            What's shown below could be from an earlier interview.
          </p>
          <button onClick={onCheckAgain} disabled={checkingAgain} className="btn-ghost" style={{ fontSize: '0.85rem' }}>
            {checkingAgain ? "Checking..." : "Check Again"}
          </button>
        </div>
      )}

      <div className="profile-summary-grid">
        <div className="panel profile-summary-panel-offer">
          <div className="profile-summary-panel-heading">
            <span className="profile-summary-icon"><OfferIcon /></span>
            <p className="panel-label" style={{ margin: 0 }}>Your Offer</p>
          </div>
          <div style={{ color: 'var(--paper)', fontSize: '0.95rem', lineHeight: '1.6' }}>
            {profile?.offer_text || "Nothing on file yet - complete a voice interview to get started."}
          </div>
        </div>
        <div className="panel profile-summary-panel-need">
          <div className="profile-summary-panel-heading">
            <span className="profile-summary-icon"><NeedIcon /></span>
            <p className="panel-label" style={{ margin: 0 }}>Your Need</p>
          </div>
          <div style={{ color: 'var(--paper)', fontSize: '0.95rem', lineHeight: '1.6' }}>
            {profile?.need_text || "Nothing on file yet - complete a voice interview to get started."}
          </div>
        </div>
      </div>

      <div className="profile-summary-actions" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button onClick={onRedo} className="btn-ghost">
          <RedoIcon />Redo Interview
        </button>
        <button onClick={onFindMatch} disabled={findingMatch} className="btn-primary">
          <SparkleIcon />{findingMatch ? "Searching..." : "Find a Match"}
        </button>
      </div>
      {findMatchMessage && (
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: 0 }}>{findMatchMessage}</p>
      )}
    </div>
  );
}
