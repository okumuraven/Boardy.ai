import { useState } from 'react';
import KuzanaMark from './KuzanaMark';

export default function LandingPage({ onJoinClick, onWhitepaperClick }) {
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (phone.length < 9) return;
    setIsSubmitting(true);

    setTimeout(() => {
      onJoinClick(phone);
    }, 600);
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>

      <nav className="nav-bar">
        <div className="brand-logo-container">
          <div className="brand-mark"><KuzanaMark /></div>
          <span className="brand-text">Kuzana Connect</span>
        </div>
        <div>
          <button onClick={onWhitepaperClick} className="nav-link">
            Read Whitepaper
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
            Drop your number below. We'll start a real voice interview right in your browser to understand your goals and match you with the right person.
          </p>

          <form onSubmit={handleSubmit} className="command-center">
            <div className="country-pill">
              <span>🇰🇪</span>
              <span>+254</span>
            </div>

            <input
              type="tel"
              placeholder="7XX XXX XXX"
              className="premium-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
              autoFocus
              disabled={isSubmitting}
            />

            <button
              type="submit"
              className={`action-btn ${phone.length >= 9 ? 'ready' : ''}`}
              disabled={phone.length < 9 || isSubmitting}
            >
              {isSubmitting ? (
                <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              )}
            </button>
          </form>
        </div>

        <div className="onboarding-visual">
          <KuzanaMark />
        </div>
      </main>
    </div>
  );
}
