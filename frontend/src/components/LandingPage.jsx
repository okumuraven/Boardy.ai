import KuzanaMark from './KuzanaMark';

export default function LandingPage({ onJoinClick, onWhitepaperClick }) {
  return (
    <div style={{ width: '100%', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>

      <nav className="nav-bar">
        <div className="brand-logo-container">
          <div className="brand-mark"><KuzanaMark /></div>
          <span className="brand-text">Kuzana Connect</span>
        </div>
        <div>
          <button onClick={onWhitepaperClick} className="nav-link">
            How It Works
          </button>
        </div>
      </nav>

      <main className="onboarding-container">
        <div className="onboarding-content">
          <h1 className="ai-greeting">
            I find you the right people. <br />
            <span className="accent-text">You build the future.</span>
          </h1>

          <p className="ai-subtext">
            Sign in with Google to start a real voice interview right in your browser - we'll understand your goals and match you with the right person.
          </p>

          <button onClick={onJoinClick} className="action-btn ready" style={{ padding: '0 2rem', height: '56px' }}>
            Get started
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '0.5rem' }}>
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>

        <div className="onboarding-visual">
          <KuzanaMark />
        </div>
      </main>
    </div>
  );
}
