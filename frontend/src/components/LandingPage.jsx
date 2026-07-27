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
            Kuzana businesses 2x revenue in 12 weeks. <br />
            <span className="accent-text">Now you can find who's building them.</span>
          </h1>

          <p className="ai-subtext">
            Only 1 in 7 applicants make it into a Kuzana batch. Kuzana Connect helps you find the right person inside that network - no more posting in WhatsApp and hoping.
          </p>

          <button onClick={onJoinClick} className="action-btn ready landing-cta" style={{ padding: '0 2rem', height: '56px' }}>
            Get started
            <svg className="landing-cta-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '0.5rem' }}>
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>

          {/* A real, honest illustrative example - never a real member's data - so
              someone who wants to see what a match actually looks like before
              signing in with a real Google account has something concrete to
              evaluate, not just a tagline. Deliberately not a live Directory
              preview: real profiles stay behind sign-in, matching Kuzana's own
              "hidden, admin-added" WhatsApp group convention and the discovery
              report's finding that vetting is an asset members value. */}
          <div className="panel" style={{ marginTop: '2rem', maxWidth: '460px' }}>
            <p className="panel-label">Illustrative example - not a real member</p>
            <p style={{ color: 'var(--paper)', fontSize: '0.92rem', margin: '0 0 0.75rem', lineHeight: '1.6' }}>
              <strong>Amina</strong> - Founder, Agribusiness<br />
              <span style={{ color: 'var(--muted)' }}>Offer: runs a cold-chain logistics operation for smallholder dairy farmers.</span><br />
              <span style={{ color: 'var(--muted)' }}>Need: a lender who understands seasonal cash-flow gaps.</span>
            </p>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: 0 }}>
              → Matched with <strong style={{ color: 'var(--paper)' }}>David</strong>, a lender focused on exactly that: seasonal working-capital gaps in agribusiness.
            </p>
          </div>
        </div>

        <div className="onboarding-visual">
          <div className="hero-visual-stack">
            <KuzanaMark />
            <div className="hero-stat-callout">
              <div className="num">2×</div>
              <div className="cap">Revenue in 12 weeks</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
