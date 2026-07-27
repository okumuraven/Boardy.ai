import KuzanaMark from './KuzanaMark';

// A one-time interstitial shown exactly once, right after ProfileSetup
// submits and before the voice interview starts - never shown again on a
// later login, since App.jsx only renders this from a transient
// `justOnboarded` flag, not anything persisted. Exists specifically to
// answer a real member complaint (kuzana_connect_discovery.md: "no proper
// introduction... not even an introduction to the Kuzana team") instead
// of dropping a brand-new member straight into a voice call with a
// stranger. Names Kyle directly, matching the Playbook's own "Kuzana
// Installation" onboarding philosophy - a human being on the other end,
// not just an algorithm.
export default function Welcome({ name, onContinue }) {
  const firstName = (name || '').trim().split(' ')[0];

  return (
    <div style={{ width: '100%', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <nav className="nav-bar">
        <div className="brand-logo-container">
          <div className="brand-mark"><KuzanaMark /></div>
          <span className="brand-text">Kuzana Connect</span>
        </div>
        <div style={{ color: 'var(--signal)', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="dot online"></span>
          Signed in
        </div>
      </nav>

      <main className="onboarding-container">
        <div className="onboarding-content">
          <h1 className="ai-greeting ai-greeting-compact">
            {firstName ? `Welcome, ${firstName}.` : 'Welcome to Kuzana Connect.'}
          </h1>

          <p className="ai-subtext" style={{ maxWidth: '520px' }}>
            This isn't a big platform with nobody behind it. Kyle and the team built Kuzana Connect
            because founders kept saying the same thing: the right person is usually already
            somewhere in the Kuzana network - just impossible to find in time.
          </p>

          <p className="ai-subtext" style={{ maxWidth: '520px' }}>
            Here's what happens next: a short voice conversation - 3 to 5 minutes, no script - about
            what you're building and what you need. Once that's done, we start looking for a real
            match. Nothing gets shared, and nobody gets connected, without your say-so.
          </p>

          <button onClick={onContinue} className="action-btn ready landing-cta" style={{ padding: '0 2rem', height: '56px' }}>
            I'm ready
            <svg className="landing-cta-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '0.5rem' }}>
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
