import { useEffect, useRef, useState } from 'react';
import KuzanaMark from './KuzanaMark';
import { CallHistoryIcon } from '../features/shell/icons';
import './LandingPage.css';

// Small inline icons matching the shared icon style (viewBox 0 0 24 24,
// stroke currentColor, strokeWidth 1.8) - real visuals for each step
// instead of the plain gray "01/02/03" text this section originally
// shipped with.
function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h16v11H9l-4 4v-4H4z" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="12.5" x2="13" y2="12.5" />
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
    Icon: MessageIcon,
    title: 'Tell us what you do',
    body: "A few minutes by voice or chat, whichever you'd rather - what you offer, what you're stuck on.",
  },
  {
    n: '02',
    Icon: SparkleIcon,
    title: 'We find your match',
    body: 'Matched against real Kuzana network members based on what you actually need - not a guess in a group chat.',
  },
  {
    n: '03',
    Icon: CallHistoryIcon,
    title: 'Connect for real',
    body: 'Schedule an intro call once you both say yes. A real conversation, not another unread message.',
  },
];

export default function LandingPage({ onJoinClick, onWhitepaperClick }) {
  const [stepsRef, stepsVisible] = useReveal();
  const [ctaRef, ctaVisible] = useReveal();

  return (
    <div className="landing-page" style={{ width: '100%', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>

      {/* Purely decorative, behind everything (z-index/pointer-events in
          CSS) - fills the large flat expanses around the hero with the
          brand's own three arc colors instead of leaving them empty,
          echoing the KuzanaMark's own shape rather than adding an
          unrelated graphic. */}
      <div className="landing-hero-bg" aria-hidden="true">
        <div className="landing-blob landing-blob-brass"></div>
        <div className="landing-blob landing-blob-signal"></div>
        <div className="landing-blob landing-blob-warn"></div>
      </div>

      <nav className="nav-bar">
        <div className="brand-logo-container">
          <div className="brand-mark"><KuzanaMark /></div>
          <span className="brand-text">Kuzana Connect</span>
        </div>
        <div>
          <button onClick={onWhitepaperClick} className="nav-link landing-nav-link">
            How It Works
          </button>
        </div>
      </nav>

      <main className="onboarding-container">
        <div className="onboarding-content">
          <p className="landing-kicker">For the Kuzana network</p>

          <h1 className="ai-greeting">
            Kuzana businesses <span className="landing-headline-highlight">2x</span> revenue in 12 weeks. <br />
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

            <div className="landing-match-person">
              <span className="landing-match-avatar landing-match-avatar-a">A</span>
              <div>
                <p className="landing-match-name">Amina <span className="landing-match-role">Founder, Agribusiness</span></p>
                <p className="landing-match-detail"><strong>Offer:</strong> runs a cold-chain logistics operation for smallholder dairy farmers.</p>
                <p className="landing-match-detail"><strong>Need:</strong> a lender who understands seasonal cash-flow gaps.</p>
              </div>
            </div>

            <div className="landing-match-connector">
              <span className="landing-match-connector-line"></span>
              <span className="landing-match-connector-badge">Matched</span>
              <span className="landing-match-connector-line"></span>
            </div>

            <div className="landing-match-person">
              <span className="landing-match-avatar landing-match-avatar-d">D</span>
              <div>
                <p className="landing-match-name">David <span className="landing-match-role">Lender</span></p>
                <p className="landing-match-detail">Focused on exactly that: seasonal working-capital gaps in agribusiness.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="onboarding-visual">
          <div className="hero-visual-stack">
            <div className="hero-mark-badge-ring">
              <div className="hero-mark-badge"><KuzanaMark /></div>
            </div>
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
          {STEPS.map(({ n, Icon, title, body }) => (
            <div key={n} className="landing-step">
              <div className="landing-step-top">
                <span className="landing-step-icon"><Icon /></span>
                <span className="landing-step-num">{n}</span>
              </div>
              <h3 className="landing-step-title">{title}</h3>
              <p className="landing-step-body">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-final-cta-band" ref={ctaRef}>
        <div className={`landing-final-cta-inner ${ctaVisible ? 'is-visible' : ''}`}>
          <h2>Stop guessing who's in the room.</h2>
          <p>Kuzana Connect puts the right person in front of you - takes a few minutes to get started.</p>
          <button onClick={onJoinClick} className="action-btn ready landing-cta landing-cta-inverted" style={{ padding: '0 2rem', height: '56px' }}>
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
