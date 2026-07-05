import { useState, useEffect, useRef } from 'react';

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
      
      {/* Premium Navbar */}
      <nav className="nav-bar">
        <div className="brand-logo-container">
          <div className="vokazi-icon">V</div>
          <span className="brand-text">Vokazi</span>
        </div>
        <div>
          <button 
            onClick={onWhitepaperClick} 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-muted)', 
              cursor: 'pointer', 
              fontSize: '0.95rem', 
              fontWeight: 500,
              transition: 'color 0.2s'
            }} 
            onMouseOver={(e) => e.target.style.color = '#fff'} 
            onMouseOut={(e) => e.target.style.color = 'var(--text-muted)'}
          >
            Read Whitepaper
          </button>
        </div>
      </nav>

      {/* Dynamic Immersive Onboarding */}
      <main className="onboarding-container">
        
        <h1 className="ai-greeting">
          I find you the right people. <br />
          <span className="gradient-text">You build the future.</span>
        </h1>
        
        <p className="ai-subtext">
          Drop your WhatsApp number below to register. We'll instantly start a secure, in-browser voice interview to understand your goals and orchestrate the perfect introduction.
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
              <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            )}
          </button>
        </form>

      </main>
    </div>
  );
}
