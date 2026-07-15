// The "welcome back" screen showing the last interview's Offer/Need,
// with a graceful fallback banner if the post-interview sync poll timed
// out before confirming fresh data.
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
    <main className="onboarding-container" style={{ justifyContent: 'center', animation: 'fadeUpIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
      <h1 className="ai-greeting" style={{ fontSize: '2.4rem', marginBottom: '0.5rem' }}>
        Welcome back.
      </h1>
      <p className="ai-subtext" style={{ maxWidth: '600px', marginBottom: '2rem' }}>
        Here's what Vokazi has on file for you from your last interview.
      </p>

      <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {syncTimedOut && (
          <div className="panel warn">
            <p className="panel-label warn">Still processing</p>
            <p style={{ color: 'rgba(237,232,221,0.85)', fontSize: '0.9rem', marginBottom: '1rem' }}>
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
          <div style={{ color: 'rgba(237,232,221,0.85)', fontSize: '0.95rem', lineHeight: '1.6' }}>
            {profile?.offer_text || "Nothing on file yet - complete a voice interview to get started."}
          </div>
        </div>
        <div className="panel">
          <p className="panel-label">Your Need</p>
          <div style={{ color: 'rgba(237,232,221,0.85)', fontSize: '0.95rem', lineHeight: '1.6' }}>
            {profile?.need_text || "Nothing on file yet - complete a voice interview to get started."}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={onRedo} className="btn-ghost">
            Redo Interview
          </button>
          <button onClick={onFindMatch} disabled={findingMatch} className="btn-primary">
            {findingMatch ? "Searching..." : "Find a Match"}
          </button>
        </div>
        {findMatchMessage && (
          <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.9rem' }}>{findMatchMessage}</p>
        )}
      </div>
    </main>
  );
}
