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
      <div className="panel">
        <p className="panel-label">Your Offer</p>
        <div style={{ color: 'var(--paper)', fontSize: '0.95rem', lineHeight: '1.6' }}>
          {profile?.offer_text || "Nothing on file yet - complete a voice interview to get started."}
        </div>
      </div>
      <div className="panel">
        <p className="panel-label">Your Need</p>
        <div style={{ color: 'var(--paper)', fontSize: '0.95rem', lineHeight: '1.6' }}>
          {profile?.need_text || "Nothing on file yet - complete a voice interview to get started."}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button onClick={onRedo} className="btn-ghost">
          Redo Interview
        </button>
        <button onClick={onFindMatch} disabled={findingMatch} className="btn-primary">
          {findingMatch ? "Searching..." : "Find a Match"}
        </button>
      </div>
      {findMatchMessage && (
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: 0 }}>{findMatchMessage}</p>
      )}
    </div>
  );
}
