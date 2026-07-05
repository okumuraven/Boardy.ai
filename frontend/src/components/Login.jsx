import { ConnectButton } from "thirdweb/react";
import { client, activeChain } from "../config/thirdweb";
import { inAppWallet } from "thirdweb/wallets";

export default function Login({ onBack, collectedPhone }) {
  return (
    <div style={{ width: '100%', minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      
      {/* Background Orbs (Consistent with LandingPage) */}
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>

      <nav className="nav-bar">
        <div className="brand-logo-container">
          <div className="vokazi-icon">V</div>
          <span className="brand-text">Vokazi</span>
        </div>
        <button 
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 500 }}
        >
          ← Change Number
        </button>
      </nav>

      <main className="onboarding-container" style={{ animation: 'fadeUpIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
        
        {/* Verification Checkmark */}
        <div style={{ 
          width: '64px', height: '64px', borderRadius: '50%', 
          background: 'rgba(0, 240, 255, 0.1)', border: '1px solid rgba(0, 240, 255, 0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
          color: 'var(--primary)', boxShadow: '0 0 30px rgba(0, 240, 255, 0.2)'
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>

        <h1 className="ai-greeting" style={{ fontSize: '2.5rem', marginBottom: '1rem', animationDelay: '0.1s' }}>
          Number Secured: <span style={{ color: 'white' }}>+254 {collectedPhone}</span>
        </h1>
        
        <p className="ai-subtext" style={{ maxWidth: '500px', animationDelay: '0.2s', marginBottom: '3rem' }}>
          To start your Voice Interview and unlock Escrow-Gated meetings, verify your professional identity with Google. We'll automatically provision your invisible Avalanche Wallet.
        </p>

        <div style={{ opacity: 0, animation: 'fadeUpIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards', animationDelay: '0.4s' }}>
          <ConnectButton
            client={client}
            chain={activeChain}
            wallets={[
              inAppWallet({
                auth: { options: ["google"] }, // Enforcing Google Auth for Calendar/Identity logic
              }),
            ]}
            theme="dark"
            connectModal={{ size: "wide", title: "Join Vokazi" }}
          />
        </div>

      </main>
    </div>
  );
}
