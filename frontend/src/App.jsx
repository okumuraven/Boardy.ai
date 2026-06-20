import { useState } from 'react';
import { ConnectButton } from "thirdweb/react";
import { client } from "./client";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import { avalancheFuji } from "thirdweb/chains";
import './index.css';

function App() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [persona, setPersona] = useState('founder');
  const [isRegistered, setIsRegistered] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [matchFound, setMatchFound] = useState(false);

  // Define supported wallets
  const wallets = [
    inAppWallet({ auth: { options: ["google", "email"] } }),
    createWallet("app.core"),
    createWallet("io.metamask"),
  ];

  const handleRegister = () => {
    if (phoneNumber.length < 9) return alert("Please enter a valid phone number");
    setIsRegistered(true);
    // Simulate Vapi initiating the outbound call right after registration
    initiateCall(phoneNumber, persona);
  };

  const initiateCall = async (userPhone, userPersona) => {
    setIsCalling(true);
    
    // Simulate the time it takes for the user to pick up and talk to the AI
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Determine payload based on persona selection
    const payload = {
      "message": {
        "type": "end-of-call-report",
        "call": { "customer": { "number": userPhone } },
        "analysis": {
          "summary": userPersona === 'founder' 
            ? "Founder needs a dev, offers design." 
            : "Developer needs design, offers smart contracts.",
          "structuredData": {
            "need": userPersona === 'founder' ? "I need a smart contract developer." : "I need UI/UX design.",
            "offer": userPersona === 'founder' ? "I can offer UI/UX design." : "I can offer smart contract development."
          }
        }
      }
    };

    try {
      await fetch('/webhook-test/vapi-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setIsCalling(false);
      setMatchFound(true);
    } catch (error) {
      console.error("Failed to trigger n8n webhook", error);
      setIsCalling(false);
    }
  };

  return (
    <div className="app-container">
      <header className="header-section">
        <div className="badge">MVP Stage 1</div>
        <h1>
          Kuzana <span className="gradient-text">Boardy.ai</span>
        </h1>
        <p className="subtitle">
          The Silicon Savannah's first NLP-driven matching engine. Voice AI ingestion, vector similarity mapping, and Web3 staking for high-conviction introductions.
        </p>
      </header>

      <div className="dashboard-grid">
        {/* Voice AI / Onboarding Card */}
        <div className="glass-card">
          <div className="card-icon">🎙️</div>
          <h3>1. Account & Voice Discovery</h3>
          <p>Register to join the network. Our Voice AI will call you immediately to extract your bottlenecks and resources.</p>
          
          {!isRegistered ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <select 
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid var(--card-border)',
                  background: 'rgba(0,0,0,0.5)',
                  color: 'white',
                  fontSize: '1rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="founder">I am a Founder (seeking a dev)</option>
                <option value="developer">I am a Developer (seeking a founder)</option>
              </select>

              <input 
                type="text" 
                placeholder="Enter Phone Number (e.g. 2547000...)" 
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid var(--card-border)',
                  background: 'rgba(0,0,0,0.5)',
                  color: 'white',
                  fontSize: '1rem',
                  outline: 'none'
                }}
              />
              <button className="btn-primary" onClick={handleRegister} style={{ borderRadius: '12px' }}>
                Register & Receive AI Call
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <button className={`btn-primary ${isCalling ? 'calling-state' : ''}`} disabled>
                {isCalling ? '☎️ AI is calling you now...' : matchFound ? 'Data Ingested ✓' : 'Processing...'}
              </button>
            </div>
          )}
        </div>

        {/* Web3 Staking Card */}
        <div className="glass-card" style={{ opacity: matchFound ? 1 : 0.5, transition: 'opacity 0.5s' }}>
          <div className="card-icon">🔺</div>
          <h3>2. Avalanche Reputation Stake</h3>
          <p>
            {matchFound 
              ? 'High-confidence match found (Similarity: 0.89). Stake USDC to unlock the introduction.' 
              : 'Waiting for vector match...'}
          </p>

          <div className="stake-box">
            <div className="stake-row">
              <span>Match Confidence</span>
              <span>89.4% (pgvector)</span>
            </div>
            <div className="divider"></div>
            <div className="stake-row">
              <span>Required Stake</span>
              <span>0.50 USDC</span>
            </div>
            <div className="stake-row">
              <span>Network</span>
              <span>Avalanche C-Chain</span>
            </div>
          </div>

          {/* Thirdweb Connect Button */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
            <ConnectButton
              client={client}
              wallets={wallets}
              chain={avalancheFuji}
              connectModal={{
                size: "compact",
                title: "Stake to Unlock",
                showThirdwebBranding: false,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
