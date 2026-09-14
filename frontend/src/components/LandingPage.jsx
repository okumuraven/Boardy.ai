import { useEffect, useRef, useState } from 'react';
import KuzanaMark from './KuzanaMark';
import './LandingPage.css';

// Fires once, the first time the section scrolls into view - not a
// living "is currently visible" state, since a reveal-in animation
// should never replay every time someone scrolls a section back into
// frame. Renders already-visible immediately for anyone with
// prefers-reduced-motion set, rather than leaving content invisible
// for someone who'll never get the triggering animation.
function useReveal() {
  const ref = useRef(null);
  // Lazy initializer, not a setState call inside the effect below - for
  // reduced motion the section should just start visible, and computing
  // that up front avoids an extra render pass the effect version would
  // cause.
  const [visible, setVisible] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  return [ref, visible];
}

const STEPS = [
  {
    n: '01',
    title: 'Tell us what you do',
    body: "A few minutes by voice or chat, whichever you'd rather - what you offer, what you're stuck on.",
  },
  {
    n: '02',
    title: 'We find your match',
    body: 'Matched against real Kuzana network members based on what you actually need - not a guess in a group chat.',
  },
  {
    n: '03',
    title: 'Connect for real',
    body: 'Schedule an intro call once you both say yes. A real conversation, not another unread message.',
  },
];

export default function LandingPage({ onJoinClick, onWhitepaperClick }) {
  const [stepsRef, stepsVisible] = useReveal();
  const [ctaRef, ctaVisible] = useReveal();

  return (
    <div className="landing-page" style={{ width: '100%', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>

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
          <p className="landing-kicker">For the Kuzana network</p>

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
          <div className="panel landing-example-card">
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
            <div className="hero-mark-badge"><KuzanaMark /></div>
            <div className="hero-stat-cluster">
              <div className="hero-stat-callout hero-stat-callout-primary">
                <div className="num">2×</div>
                <div className="cap">Revenue in 12 weeks</div>
              </div>
              <div className="hero-stat-callout hero-stat-callout-secondary">
                <div className="num">1/7</div>
                <div className="cap">Applicants selected</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <section className="landing-section" ref={stepsRef}>
        <p className="landing-section-kicker">How it works</p>
        <h2 className="landing-section-title">From first hello to your first introduction.</h2>

        <div className={`landing-steps-grid ${stepsVisible ? 'is-visible' : ''}`}>
          {STEPS.map((step) => (
            <div key={step.n} className="landing-step">
              <span className="landing-step-num">{step.n}</span>
              <h3 className="landing-step-title">{step.title}</h3>
              <p className="landing-step-body">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-final-cta" ref={ctaRef}>
        <div className={`landing-final-cta-inner ${ctaVisible ? 'is-visible' : ''}`}>
          <h2>Stop guessing who's in the room.</h2>
          <p>Kuzana Connect puts the right person in front of you - takes a few minutes to get started.</p>
          <button onClick={onJoinClick} className="action-btn ready landing-cta" style={{ padding: '0 2rem', height: '56px' }}>
            Get started
            <svg className="landing-cta-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '0.5rem' }}>
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>
      </section>

      {/* Real static pages (frontend/public/*.html), not in-app views -
          Google's OAuth verification needs these reachable at a plain
          URL with no sign-in required, and every visitor should be able
          to find them regardless, not just Google's reviewers. */}
      <footer className="landing-footer">
        <div className="landing-footer-bar"></div>
        <p className="landing-footer-text">
          By continuing, you agree to our{' '}
          <a href="/terms.html">Terms &amp; Conditions</a> and{' '}
          <a href="/privacy.html">Privacy Policy</a>.
        </p>
      </footer>
    </div>
  );
}
