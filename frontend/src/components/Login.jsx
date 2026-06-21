import { ConnectButton } from "thirdweb/react";
import { client } from "../client";
import { inAppWallet } from "thirdweb/wallets";

export default function Login({ onBack }) {
  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={onBack}
        style={{ position: 'absolute', top: '-3rem', left: '0', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        ← Back to Home
      </button>

      <div className="glass-card animate-in" style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ width: '72px', height: '72px', background: 'linear-gradient(135deg, var(--primary), #ff5e78)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 8px 30px var(--primary-glow)' }}>
            <span style={{ fontSize: '2.5rem', color: 'white', fontWeight: 'bold' }}>B</span>
          </div>
          <h1 className="title">Boardy.ai</h1>
          <p className="subtitle">Connect your wallet or use social login to enter the Verified Professional Synergy Protocol.</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <ConnectButton
            client={client}
            wallets={[
              inAppWallet({
                auth: { options: ["google", "email", "apple"] },
              }),
            ]}
            theme="dark"
            connectModal={{ size: "wide", title: "Join Boardy.ai" }}
          />
        </div>
      </div>
    </div>
  );
}
