import { ConnectButton } from "thirdweb/react";
import { client, activeChain } from "../config/thirdweb";
import { inAppWallet } from "thirdweb/wallets";
import KuzanaMark from "./KuzanaMark";

export default function Login({ onBack, collectedPhone }) {
  return (
    <div style={{ width: '100%', minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

      <nav className="nav-bar">
        <div className="brand-logo-container">
          <div className="brand-mark"><KuzanaMark /></div>
          <span className="brand-text">Kuzana Connect</span>
        </div>
        <button onClick={onBack} className="nav-link">
          ← Change Number
        </button>
      </nav>

      <main className="onboarding-container" style={{ animation: 'fadeUpIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
        <div className="onboarding-content">
          {/* Verification Checkmark */}
          <div style={{
            width: '60px', height: '60px', borderRadius: '3px',
            border: '1.5px solid var(--brass)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem',
            color: 'var(--brass)'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>

          <h1 className="ai-greeting" style={{ fontSize: '2.3rem', marginBottom: '1rem', animationDelay: '0.1s' }}>
            Number secured: <span className="accent-text">+254 {collectedPhone}</span>
          </h1>

          <p className="ai-subtext" style={{ maxWidth: '500px', animationDelay: '0.2s', marginBottom: '3rem' }}>
            To start your voice interview, verify your identity with Google. It only takes a moment.
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
              theme="light"
              connectModal={{ size: "wide", title: "Join Kuzana Connect" }}
            />
          </div>
        </div>

        <div className="onboarding-visual">
          <KuzanaMark />
        </div>
      </main>
    </div>
  );
}
